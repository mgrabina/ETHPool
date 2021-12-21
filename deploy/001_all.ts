import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { shouldVerifyContract } from 'utils/deploy';

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const currentNonce: number = await ethers.provider.getTransactionCount(deployer);

  // deploy the ETHPool
  const ETHPool = await hre.deployments.deploy('ETHPool', {
    contract: 'contracts/ETHPool.sol:ETHPool',
    from: deployer,
    log: true,
  });

  if (hre.network.name !== 'hardhat' && (await shouldVerifyContract(ETHPool))) {
    await hre.run('verify:verify', {
      address: ETHPool.address
    });
  }
};

deployFunction.tags = ['ETHPool', 'testnet'];

export default deployFunction;
