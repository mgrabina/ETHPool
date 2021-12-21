import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { ETHPool, ETHPool__factory } from '@typechained';
import { evm } from '@utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import { MockContract, MockContractFactory, smock } from '@defi-wonderland/smock';

chai.use(smock.matchers);

describe('ETHPool', function () {
  // Users
  let deployer: SignerWithAddress;
  let randomUser: SignerWithAddress;

  // Contracts
  let ETHPool: MockContract<ETHPool>;
  let ETHPoolFactory: MockContractFactory<ETHPool__factory>;

  // Setup
  let snapshotId: string;

  before(async () => {
    [, deployer, randomUser] = await ethers.getSigners();

    ETHPoolFactory = await smock.mock<ETHPool__factory>('ETHPool');
    ETHPool = await ETHPoolFactory.connect(deployer).deploy();

    snapshotId = await evm.snapshot.take();
  });

  beforeEach(async () => {
    await evm.snapshot.revert(snapshotId);
  });

  describe('Ownership', () => {
    it('The deployer is the owner of the contract', async () => {
      expect(await ETHPool.owner()).to.eq(deployer.address);
    });


  });

  describe('Deposits', () => {
    it('Anyone is able to deposit', async () => {
      expect(await ETHPool.connect(randomUser).deposit({value: ethers.utils.parseEther('0.1')}))
        .to.emit(ETHPool, 'Deposit')
        .withArgs(randomUser.address, ethers.utils.parseEther('0.1'));
      expect(await ETHPool.getBalance(randomUser.address))
        .to.eq(ethers.utils.parseEther('0.1'));
    });
  });

  describe('Withdrawals', () => {
    it('Nothing to withdrawal', async () => {
      await expect(ETHPool.connect(randomUser).withdraw())
        .to.be.revertedWith('You have no balance to withdraw');
    });

    it('Anyone can withdraw', async () => {
      expect(await ETHPool.connect(randomUser).deposit({value: ethers.utils.parseEther('0.1')}))
        .to.emit(ETHPool, 'Deposit');

      expect(await ETHPool.connect(randomUser).withdraw())
        .to.emit(ETHPool, 'Withdraw')
        .withArgs(randomUser.address, ethers.utils.parseEther('0.1'));
    });
  });

  describe('Rewards', () => {
    it('Only owner can reward', async () => {
      await expect(ETHPool.connect(randomUser)
        .reward({value: ethers.utils.parseEther('0.2')}))
        .to.be.reverted;
      
        expect(await ETHPool.connect(deployer)
        .reward({value: ethers.utils.parseEther('0.2')}))
        .to.emit(ETHPool, 'Reward').withArgs(ethers.utils.parseEther('0.2'));
    });
  });

  // For e2e tests (entire flow tests) go to /tests/e2e/*.test.ts
});
