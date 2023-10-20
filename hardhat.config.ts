import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import {ethers} from "ethers";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

const config: HardhatUserConfig = {
  solidity: "0.8.12",
  networks: {
    hardhat: {
      accounts: {
        count: 100,
        accountsBalance: "10000000000000000000000000"
      },
      forking: {
        url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
        blockNumber: 46470180
      }
    },
    polygon: {
      url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`],
      gas: 8000000,
      gasPrice: ethers.utils.parseUnits('200', 'gwei').toNumber(),
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`],
      gas: 8000000,
      gasPrice: ethers.utils.parseUnits('200', 'gwei').toNumber(),
    },
    mantle: {
      url: `https://rpc.mantle.xyz`,
      accounts: [`${process.env.PRIVATE_KEY}`],
      chainId: 5000,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: "P78HUI9K9SAM5QKD6ABU91G3CPDS98MZW2",
      polygon: "5KZMXJXAZRC311U3YZ916DS7Y1US8Y4TT1",
      mumbai: "5KZMXJXAZRC311U3YZ916DS7Y1US8Y4TT1",
      mantle: "xyz"
    },
    customChains: [
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://explorer.mantle.xyz/api",
          browserURL: "https://explorer.mantle.xyz/"
        }
      }
    ]
  }
};

export default config;
