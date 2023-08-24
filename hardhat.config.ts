import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

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
    }
  }
};

export default config;
