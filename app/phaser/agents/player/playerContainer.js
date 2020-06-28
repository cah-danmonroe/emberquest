import PlayerPhaserAgent from "./player-phaser-agent";
import BasePhaserAgentContainer from "../base-phaser-agent-container";
import {tracked} from '@glimmer/tracking';

export default class PlayerContainer extends BasePhaserAgentContainer {

  @tracked boardedTransport;

  constructor(scene, config, agent) {

    config.showPowerBar = true;

    super(scene, config);

    this.scene = scene;
    this.board = scene.board;
    this.ember = this.scene.game.ember;
    this.containerType = this.scene.game.ember.constants.SHAPE_TYPE_PLAYER;

    this.id = config.id;
    this.playerAttacking = false;

    this.isPlayer = true;
    this.showPowerBar = true;
    this.damageColor = "#ff7700";
    this.damageFont = "22px Arial";

    this.agent = agent;

    this.showPowerBar = true;

    this.cachedHealthPercentage = 0;

    // set a size on the container
    this.setSize(config.textureSize.width, config.textureSize.height);

    // enable physics
    this.scene.physics.world.enable(this);

    // collide with world bounds
    //
    // Setting this to true prevents the player from completing
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
    this.setDepth(this.ember.constants.TILEZ_PLAYER);

    this.phaserAgentSprite = this.player;
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
      let canMove = this.ember.playerHasAbilityFlag(pathFinder.scene.player.container, this.ember.constants.FLAG_TYPE_TRAVEL, allattrs.tF);

      // canMove will also be false if trying to move from sea to land or air to land
      if (!canMove) {

        // is there a sea transport at targetTile
        if (this.ember.map.tileIsDock(pathFinder.scene, curTile)) {
          canMove = this.ember.map.targetTileHasTransport(pathFinder.scene, targetTile);

        // is there an air transport at targetTile
        } else if (this.ember.map.tileIsNest(pathFinder.scene, targetTile)) {
          canMove = this.ember.map.targetTileHasTransport(pathFinder.scene, targetTile);

        } else if (this.boardedTransport) {
          // already on board a transport.. is target tile a dock?

          // boardedTransport is air transport and currentTile is nest, and target tile is land, let move
          if (this.ember.map.tileIsNest(pathFinder.scene, curTile)) {
            const targetTileIsLand = this.ember.map.tileIsLand(pathFinder.scene, targetTile);
            if (targetTileIsLand && this.boardedTransport.agent.playerConfig.transferAtNest) {
              this.disembarkTransport = true;
              canMove = true;
            }
            // return this.ember.map.tileIsLand(pathFinder.scene, targetTile);
          } else {
            const targetTileIsDock = this.ember.map.tileIsDock(pathFinder.scene, targetTile);

            if (targetTileIsDock && this.boardedTransport.agent.playerConfig.transferAtDock) {
              this.disembarkTransport = true;
              canMove = true;
            }
          }

        }
      } else if ( ! this.boardedTransport) {  // don't adjust speed/power when on a transport

        this.moveToObject.setSpeed(config.speed * allattrs.spdC);

        this.agent.power -= (2 - allattrs.spdC);

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
        const travelFlags = this.ember.map.getTileAttribute(pathFinder.chessData.board.scene, targetTile, 'tF');
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
        if (this.boardedTransport && !this.disembarkTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.SE);
        }
      } else if (cursors.S.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.S);
        if (this.boardedTransport && !this.disembarkTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.S);
        }
      } else if (cursors.A.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.SW);
        if (this.boardedTransport && !this.disembarkTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.SW);
        }
      } else if (cursors.Q.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.NW);
        if (this.boardedTransport && !this.disembarkTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.NW);
        }
      } else if (cursors.W.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.N);
        if (this.boardedTransport && !this.disembarkTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.N);
        }
      } else if (cursors.E.isDown) {
        this.moveToObject.moveToward(this.ember.constants.DIRECTIONS.NE);
        if (this.boardedTransport && !this.disembarkTransport) {
          this.boardedTransport.moveToObject.moveToward(this.ember.constants.DIRECTIONS.NE);
        }
      }
    }
  }

  moveToComplete(playerContainer, moveTo) {
    // console.log('player moveToComplete', playerContainer.agent.playerConfig.texture);
    moveTo.scene.game.ember.saveSceneData(moveTo.scene);
    let fieldOfViewTileXYArray = playerContainer.fov.findFOV(playerContainer.visiblePoints);
    moveTo.scene.game.ember.map.findAgentFieldOfView(playerContainer, fieldOfViewTileXYArray);
    moveTo.scene.game.ember.processPlayerMove(playerContainer, moveTo, fieldOfViewTileXYArray);
  }

}
