import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { constants } from 'emberquest/services/constants';
import { timeout } from 'ember-concurrency';
import { restartableTask } from 'ember-concurrency-decorators';
import {Transport} from "../objects/models/transport";
import {Agent} from "../objects/models/agent";

export default class SpawnerService extends Service {


  @service agentPool;
  @service transportPool;

  @tracked uniques;
  @tracked spawnLocations;
  // @tracked spawnInterval = 300;
  @tracked spawnInterval = 1000;

  @tracked spawners = [];

  @tracked transports = [];
  @tracked transportLimit = 1;

  @tracked agents = [];
  @tracked agentLimit = 1;


  scene = undefined;

  setup(scene) {
    this.scene = scene;
    this.spawnLocations = this.scene.mapData.spawnLocations;
    this.uniques = this.scene.mapData.uniques;
    this.spawners = [];
    this.transports = [];
    this.agents = [];

// debugger
    // Transports
    let boardedTransportId = 0;
    try {
      boardedTransportId = scene.ember.gameManager.storedData.gameboardData.playerAttrs.boardedTransport;
      // console.log('boardedTransportId', boardedTransportId)
      if (boardedTransportId) {
        const transportConfigFromPool = this.transportPool.findTransportById(boardedTransportId);
        // console.log('found trans obj', transportConfigFromPool);
        if (transportConfigFromPool) {
          const location = {x: scene.ember.gameManager.storedData.gameboardData.playerTile.x, y: scene.ember.gameManager.storedData.gameboardData.playerTile.y};
          const transport = new Transport(location.x, location.y, Object.assign(location, transportConfigFromPool));
          transport.isBoardedTransport = true;
          this.addTransport(transport);

        }
      }
    } catch(e) {
      // console.log('no boarded transport', e)
    }

    // load transports that originated from other scenes but were "parked" on this scene
    try {
      scene.ember.gameData.transports.forEach(sceneTransport => {
        if (boardedTransportId !== sceneTransport.id && sceneTransport.map === scene.mapname) {
          const transportConfigFromPool = this.transportPool.findTransportById(sceneTransport.id);
          // console.log('found scene trans obj', transportConfigFromPool);
          if (transportConfigFromPool) {
            const location = {x: sceneTransport.tile.x, y: sceneTransport.tile.y};
            const transport = new Transport(location.x, location.y, Object.assign(location, transportConfigFromPool));
            this.addTransport(transport);
          }
        }
      })
    } catch(e) {
      // console.log('no boarded transport', e)
    }

    if (this.spawnLocations.transports && this.spawnLocations.transports.length > 0) {
      // this.transportLimit = this.spawnLocations.transports.limit || 1;
      // this.spawners.push(constants.SPAWNER_TYPE.TRANSPORT);
      this.spawnLocations.transports.forEach(transportObj => {
        // console.log('transport', transportObj);
        this.spawnObject(constants.SPAWNER_TYPE.TRANSPORT, transportObj);
      });
    }

    // create agent spawners
    if (this.spawnLocations.agents && this.spawnLocations.agents.locations.length > 0) {
      // console.log('this.spawnLocations.agents.locations', this.spawnLocations.agents.locations)
      this.agentLimit = this.spawnLocations.agents.limit || 1;
      this.spawnInterval = this.spawnLocations.agents.spawnInterval || 3000;
      this.spawners.push(constants.SPAWNER_TYPE.AGENT);
    }

    this.spawnObjects.perform();

  }

  // spawn one time objects that won't respawn
  spawnUniques() {
    if (this.uniques && this.uniques.agents && this.uniques.agents.length > 0) {
      this.uniques.agents.forEach(unique => {
        const agentConfig = this.agentPool.getAgentConfig(unique.agentKey);
        // console.log('unique agentConfig ', agentConfig)

        if (agentConfig) {

          // don't spawn uniques that are already dead
          if ( ! (this.scene.deadAgents && this.scene.deadAgents.has(unique.uniqueId))) {

            if (unique.patrol) {
              // assign any properties
              Object.assign(agentConfig.patrol, unique.patrol)
            }
            if (agentConfig.override) {
              Object.assign(agentConfig, unique.override);
            }


            agentConfig.uniqueId = unique.uniqueId;

            const agent = new Agent(unique.x, unique.y, agentConfig);

            this.addAgent(agent);
          }
        }
      })
    }
  }

  @restartableTask
  *spawnObjects() {
    while (this.spawners.length > 0) {
      if (!this.scene.ember.gameManager.gamePaused) {
        this.spawners.forEach(spawnerType => {
          if (this.shouldSpawn(spawnerType)) {
            this.spawnObject(spawnerType);
          } else {
            // console.log('   >> ' + spawnerType + ' - NO!! Dont spawn')
          }
        });
        yield timeout(this.spawnInterval);
      } else {
        console.log('no spawn, game paused')
        yield timeout(1000);
      }
    }
  }

  shouldSpawn(spawnerType) {
    switch (spawnerType) {
      case constants.SPAWNER_TYPE.AGENT:
        if (this.spawnLocations.agents.locations.length === 0 || this.agents.length >= this.agentLimit) {
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  }

  spawnObject(spawnerType, objectConfig) {
    let location, locationClone, agentConfigFromPool, transportConfigFromPool;
    switch (spawnerType) {

      case constants.SPAWNER_TYPE.TRANSPORT:
        location = {x: objectConfig.x, y: objectConfig.y};
        transportConfigFromPool = this.transportPool.getTransportConfig(objectConfig.poolkey);
        if (transportConfigFromPool) {
          this.addTransport(new Transport(location.x, location.y, Object.assign(location, transportConfigFromPool)));
        }
        break;

      case constants.SPAWNER_TYPE.AGENT:
        location = this.pickRandomLocation(spawnerType);
        agentConfigFromPool = Object.assign({}, this.pickRandomAgentFromPool(location));
        locationClone = Object.assign({}, location);
        if (agentConfigFromPool) {
          if (locationClone.patrol) {
            // assign any properties
            Object.assign(agentConfigFromPool.patrol, locationClone.patrol)
          }
          if (locationClone.override) {
            Object.assign(agentConfigFromPool, locationClone.override)
          }
          const agent = new Agent(locationClone.x, locationClone.y, Object.assign(locationClone, agentConfigFromPool));
          this.addAgent(agent);
        }
        break;

      default:
        break;
    }

  }

  pickRandomLocation(spawnerType) {
    let location, invalidLocation = false;
    switch (spawnerType) {
      // case constants.SPAWNER_TYPE.TRANSPORT:
      //   location = this.spawnLocations.transports.locations[Math.floor(Math.random() * this.spawnLocations.transports.locations.length)];
      //   break;
      case constants.SPAWNER_TYPE.AGENT:
        location = this.spawnLocations.agents.locations[Math.floor(Math.random() * this.spawnLocations.agents.locations.length)];
        invalidLocation = this.agents.some((obj) => {
          return obj.x === location.x && obj.y === location.y;
        });
        break;
      default:
        break;
    }

    if (invalidLocation) {
      return this.pickRandomLocation(spawnerType);
    }
    return location;
  }

  pickRandomAgentFromPool(location) {
    const agentPool = location.pool || this.spawnLocations.agents.globalPool || [];
    if (!agentPool) {
      return undefined;
    }
    const agentKey = agentPool[Math.floor(Math.random() * agentPool.length)];
    // console.log('         >>  pick random agent', agentKey);

    if (!agentKey) {
      return undefined;
    }

    const agentConfig = this.agentPool.getAgentConfig(agentKey);

    return agentConfig;
  }

  findTransportByObjectConfigId(id) {
    return this.transports.find(transport => {
      console.log('find transport by objectConfigId', transport.objectConfig)
      return transport.objectConfig.id === id;
    });
  }
  addTransport(transport) {
    console.log('addTransport', transport.objectConfig)

    if (!this.findTransportByObjectConfigId(transport.objectConfig.id)) {


      // dont spawn for a transport that is parked on another scene
      let okToSpawn = true;
      if (!transport.isBoardedTransport && this.scene.ember.gameData && this.scene.ember.gameData.transports) {
        const savedTransportInThisSceneIndex = this.scene.ember.gameData.transports.findIndex(savedTransport => {
          // console.log('savedTransport', savedTransport)
            return savedTransport.id === transport.objectConfig.id;
            // return savedTransport.id === transport.objectConfig.id && savedTransport.map !== this.scene.mapname;
        });
        if (savedTransportInThisSceneIndex >= 0) {
          okToSpawn = this.scene.ember.gameData.transports[savedTransportInThisSceneIndex].map === this.scene.mapname;
        }
      }

      // this.scene.ember.gameData.transports

      if (okToSpawn) {
        // console.log('going to spawn transport');
        this.transports.pushObject(transport);
        this.scene.events.emit('transportSpawned', transport);
      }
    } else {
      // console.log('already spawned transport with id', transport.objectConfig.id);
    }
  }

  deleteTransport(transportId) {
    delete this.transports[transportId];
  }

  addAgent(agent) {
    // console.log('*** spawner service - add agent', agent.id, agent.x, agent.y)
      this.agents.push(agent);
      this.scene.events.emit('agentSpawned', agent);
  }

  deleteAgent(agentContainer) {
    // console.log('!!! delete agent', agentContainer)

    const index = this.agents.findIndex(agentObj => {
      return agentObj.id === agentContainer.agent.playerConfig.uuid;
    });

    if (index > -1) {
      this.agents.splice(index, 1);
    }
  }
}
