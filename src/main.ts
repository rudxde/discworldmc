import * as fs from 'fs';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Configuration } from './configuration';
import { RedisServerStatusPersistance } from './redis/redis-server-status-persistance';
import { Kubernetes } from './kubernetes/kubernetes';
import { MinecraftServerService } from './domain/service/minecraft-server-service';
import {} from 'fs';
import { I18n } from './i18n';
import { join as joinPath } from 'path';

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

async function readI18nFile(language: string): Promise<I18n> {
    const i18nFilePath = joinPath(__dirname, `../i18n/${language}.json`);
    if (!fs.existsSync(i18nFilePath)) {
        throw new Error(`The language ${language} is not supported`);
    }
    const i18n = JSON.parse(fs.readFileSync(i18nFilePath, "utf8"));
    const i18nInstance = plainToInstance(I18n, i18n);
    await validateOrReject(i18nInstance);
    return i18nInstance;
}

async function main() {
    const config = await readConfigFile();
    const i18n = await readI18nFile(config.language);
    const redisServerPersistance = await RedisServerStatusPersistance.init(config.redis.host, config.redis.port);
    const kubernetes = await Kubernetes.init();
    const minecraftServerService = new MinecraftServerService(undefined, redisServerPersistance, kubernetes, config);
    
    minecraftServerService.start();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
