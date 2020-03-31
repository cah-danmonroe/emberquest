// import Phaser from 'phaser';
import PlayerPhaserAgent from "./player-phaser-agent";
import BasePhaserAgentContainer from "../base-phaser-agent-container";
import {tracked} from '@glimmer/tracking';

export default class PlayerContainer extends BasePhaserAgentContainer {

  // scene = undefined;
  // ember = undefined;

// @tracked maxHealth;
// @tracked health;
// @tracked maxPower;
// @tracked power;
// @tracked healingSpeed = 3000;
// @tracked healingPower = 2;
// @tracked energizeSpeed = 2000;
// @tracked energizePower = 2;
  @tracked boardedTransport;


  // @task
  // *reloadPower() {
  //   while (this.power < this.maxPower) {
  //     // console.log('reloadPower')
  //     yield timeout(this.energizeSpeed);
  //     this.power += Math.max(1, this.energizePower);
  //   }
  // }

  constructor(scene, config, agent) {

    config.showPowerBar = true;

    super(scene, config);

    // super(scene, config.playerX, config.playerY);

    this.scene = scene;
    this.board = scene.board;
    this.ember = this.scene.game.ember;
    this.containerType = this.scene.game.ember.constants.SHAPE_TYPE_PLAYER;

    this.id = config.id;
    this.playerAttacking = false;

    this.isPlayer = true;
    this.showPowerBar = true;

    this.agent = agent;

    // this.flipX = true;
    // this.swordHit = false;
    // this.health = config.health || 5;
    // this.maxHealth = config.maxHealth;
    // this.power = config.power;
    // this.maxPower = config.maxPower;
    // this.attackAudio = config.attackAudio;

    this.showPowerBar = true;
    // this.healingSpeed = 1000;
    // this.healingPower = 3;

    this.cachedHealthPercentage = 0;

    // set a size on the container
    this.setSize(config.textureSize.width, config.textureSize.height);

    // enable physics
    this.scene.physics.world.enable(this);

    // collide with world bounds
    //
    // Setting this to tr prevents the player from completing
    // a move to the outer edges of the map (causing endless loop)
    // and then they get stuck and can't move away from the edge.
    //
    // this.body.setCollideWorldBounds(true);

    // add the player container to our existing scene
    this.scene.add.existing(this);

    // have the camera follow the player
    this.scene.cameras.main.startFollow(this);


    // create the player
    this.player = new PlayerPhaserAgent(this.scene, config);
    this.add(this.player);

    this.phaserAgent = this.player;
    // this.agent = new Player

    this.moveToObject = this.scene.rexBoard.add.moveTo(this, {
      speed: config.speed, // 400 default
      occupiedTest: true,
      blockerTest: true
    });

    this.moveToObject.on('complete', this.moveToComplete);

    this.moveToObject.moveableTestCallback = (curTile, targetTile, pathFinder) => {

// TODO  Take this out or the player can move anywhere
// return true;

      if (this.moveToObject.isRunning || this.agent.power <= 1) {
        return false;
      }

      const allattrs = this.ember.map.getTileAttribute(pathFinder.scene, targetTile);
      let canMove = this.ember.playerHasAbilityFlag(pathFinder.scene.player.container, this.ember.constants.FLAG_TYPE_TRAVEL, allattrs.travelFlags);
// console.log('moveableTestCallback ', targetTile)
      if (!canMove) {
        // console.log('cant move! targetTile', targetTile, 'travelFlags', allattrs.travelFlags, 'wesnoth', allattrs.wesnoth);

        // is there a transport at targetTile
        const currentTileIsDock = this.ember.map.tileIsDock(pathFinder.scene, curTile);

        if (currentTileIsDock) {
          canMove = this.ember.map.targetTileHasTransport(pathFinder.scene, targetTile);

        } else if (this.boardedTransport) {
          // already on board a transport.. is target tile a dock?
          const targetTileIsDock = this.ember.map.tileIsDock(pathFinder.scene, targetTile);
          if (targetTileIsDock) {
            this.disembarkTransport = true;

            canMove = true;
          }
        }
      } else if ( ! this.boardedTransport) {  // don't adjust speed/power when on a transport

        this.moveToObject.setSpeed(config.speed * allattrs.speedCost);

        this.agent.power -= (2 - allattrs.speedCost);

        // if (this.power <= 2) {
        //   console.log('No power to move!')
        //   canMove = false;
        // }
      }

      return canMove;

    };

    // add behaviors
    this.pathFinder = this.scene.rexBoard.add.pathFinder(this, {
      occupiedTest: true,
      pathMode: 'A*',
      blockerTest: true,
      costCallback: (curTile, targetTile, pathFinder) => {
        // pathFinder.gameObject is 'this'  i.e., this Player object
        const travelFlags = this.ember.map.getTileAttribute(pathFinder.chessData.board.scene, targetTile, 'travelFlags');
        console.error('pathFinder costCallback', curTile, targetTile, pathFinder, travelFlags);

        return travelFlags ? 100 : 0;
        // return travelFlags ? fov.BLOCKER : 0;
        // return (board.tileXYZToChess(tileXY.x, tileXY.y, 0)) ? fov.BLOCKER : 0;
      },

    });

    this.sightRange = config.sightRange;   // this is sight/movement Range
    this.movingPoints = config.movingPoints;   // this is sight/movement Range
    this.visiblePoints = config.visiblePoints;   // this is sight/movement Range

    this.setData('attrs', config.flagAttributes);

    this.ember.playerContainer = this;
    // this.setDepth(15);

    this.createHealthBar();
    this.reloadHealth.perform();
    this.reloadPower.perform();
  }

  update(cursors) {
    if (!this.ember.gameManager.gamePaused) {
      this.moveTo(cursors);
      this.baseUpdate();
    }
  }


  moveTo(cursors) {

    if (!this.moveToObject.isRunning) {

      if (cursors.D.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.SE);
        if (this.boardedTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.SE);
        }
      } else if (cursors.S.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.S);
        if (this.boardedTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.S);
        }
      } else if (cursors.A.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.SW);
        if (this.boardedTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.SW);
        }
      } else if (cursors.Q.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.NW);
        if (this.boardedTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.NW);
        }
      } else if (cursors.W.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.N);
        if (this.boardedTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.N);
        }
      } else if (cursors.E.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.NE);
        if (this.boardedTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.NE);
        }
      }
    }
  }

  moveToComplete(playerContainer, moveTo) {
    // console.log('move complete');
    moveTo.scene.game.ember.saveSceneData(moveTo.scene);
    // moveTo.scene.game.ember.saveGameData("playerTile", playerContainer.rexChess.tileXYZ);
    moveTo.scene.game.ember.map.findFOV(playerContainer);
    moveTo.scene.game.ember.processPlayerMove(playerContainer, moveTo);
  }



}
