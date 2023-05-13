import * as fs from 'fs';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Configuration } from './configuration';

async function readConfigFile(): Promise<Configuration> {
    const configFilePath = process.env.CONFIG_FILE_PATH;
    if (!configFilePath) {
        throw new Error("CONFIG_FILE_PATH is not set");
    }
    if (!fs.existsSync(configFilePath)) {
        throw new Error(`File ${configFilePath} does not exist`);
    }
    const config = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    const configInstance = plainToInstance(Configuration, config);
    await validateOrReject(configInstance);
    return configInstance;
}


async function main() {
    const config = await readConfigFile();

    console.log("Hello World");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
