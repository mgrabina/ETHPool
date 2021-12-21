import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ETHPool,
  ETHPool__factory,
} from '@typechained';
import { evm } from '@utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';

const FORK_BLOCK_NUMBER = 11298165;

describe('ETHPool', function () {
  // signers
  let team: SignerWithAddress;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;

  // factories
  let ETHPoolFactory: ETHPool__factory;

  // contracts
  let ETHPool: ETHPool;
  
  // misc
  let snapshotId: string;

  before(async () => {
    // forking mainnet
    await evm.reset({
      jsonRpcUrl: process.env.RPC_ROPSTEN,
      blockNumber: FORK_BLOCK_NUMBER,
    });

    // getting signers with ETH
    [, team, userA, userB] = await ethers.getSigners();

    // deploying contracts
    ETHPoolFactory = (await ethers.getContractFactory('ETHPool')) as ETHPool__factory;
    ETHPool = await ETHPoolFactory.connect(team).deploy();

    // snapshot
    snapshotId = await evm.snapshot.take();
  });

  beforeEach(async () => {
    await evm.snapshot.revert(snapshotId);
  });

  /* 
    A deposits 100, and B deposits 300 for a total of 400 in the pool. 
    Now A has 25% of the pool and B has 75%. When T deposits 200 rewards, A should be able to withdraw 150 and B 450.
  */
  it('Flow 1 - No late investors', async () => {
    await ETHPool.connect(userA).deposit({ value: 100 });
    await ETHPool.connect(userB).deposit({ value: 300 });
    await ETHPool.connect(team).reward({ value: 200 });

    expect(await ETHPool.connect(userA).withdraw()).to.emit(ETHPool, 'Withdraw').withArgs(userA.address, 150);
    expect(await ETHPool.connect(userB).withdraw()).to.emit(ETHPool, 'Withdraw').withArgs(userB.address, 450);
  });

  /* 
    A deposits then T deposits then B deposits then A withdraws and finally B withdraws. 
    A should get their deposit + all the rewards. B should only get their deposit because rewards were sent to the pool before they participated.
  */
  it('Flow 2 - Late investors', async () => {
    await ETHPool.connect(userA).deposit({ value: 100 });
    await ETHPool.connect(team).reward({ value: 200 });
    await ETHPool.connect(userB).deposit({ value: 300 });

    expect(await ETHPool.connect(userA).withdraw()).to.emit(ETHPool, 'Withdraw').withArgs(userA.address, 300); // 100 + 200 rewards
    expect(await ETHPool.connect(userB).withdraw()).to.emit(ETHPool, 'Withdraw').withArgs(userB.address, 300);
  })

  it('Flow 3 - Complex', async () => {
    await ETHPool.connect(userA).deposit({ value: 100 }); // A 100 
    await ETHPool.connect(team).reward({ value: 200 });   // A 200
    await ETHPool.connect(userA).deposit({ value: 100 }); // A 100
    await ETHPool.connect(userB).deposit({ value: 300 }); // B 300
    await ETHPool.connect(team).reward({ value: 700 });   // A 400 B 300
    await ETHPool.connect(userB).deposit({ value: 300 }); // B 300

    expect(await ETHPool.connect(userA).withdraw()).to.emit(ETHPool, 'Withdraw').withArgs(userA.address, 800); // 200 deposits + 600 rewards
    expect(await ETHPool.connect(userB).withdraw()).to.emit(ETHPool, 'Withdraw').withArgs(userB.address, 900); // 600 deposits + 300 rewards
  })
});
