import { plainToClass, plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import * as fs from 'fs';
import 'reflect-metadata';
import { Configuration } from './configuration';
import { RedisServerStatusPersistance } from './redis/redis-server-status-persistance';
import { KubernetesProviderService } from './kubernetes/kubernetes-provider-service';
import { MinecraftServerService } from './domain/service/minecraft-server-service';
import { } from 'fs';
import { I18n } from './i18n';
import { join as joinPath } from 'path';
import { MinecraftServerStatusProviderService } from './minecraft/minecraft-server-status-provider-service';
import { AuthProviderService } from './auth/service/auth-provider-service';
import { CliInterface } from './testing/cli-interface';
import { HttpInterface } from './testing/http-interface';

async function readConfigFile(): Promise<Configuration> {
    const configFilePath = process.env.CONFIG_FILE_PATH;
    if (!configFilePath) {
        throw new Error('CONFIG_FILE_PATH is not set');
    }
    if (!fs.existsSync(configFilePath)) {
        throw new Error(`File ${configFilePath} does not exist`);
    }
    const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    const configInstance = plainToClass(Configuration, config);
    await validateOrReject(configInstance)
        .catch((errors) => {
            console.error(errors.toString());
            process.exit(1);
        });
    return configInstance;
}

async function readI18nFile(language: string): Promise<I18n> {
    const i18nFilePath = joinPath(__dirname, `../i18n/${language}.json`);
    if (!fs.existsSync(i18nFilePath)) {
        throw new Error(`The language ${language} is not supported`);
    }
    const i18n = JSON.parse(fs.readFileSync(i18nFilePath, 'utf8'));
    const i18nInstance = plainToInstance(I18n, i18n);
    await validateOrReject(i18nInstance)
        .catch((errors) => {
            console.error(errors.toString());
            process.exit(1);
        });;
    return i18nInstance;
}

async function main(): Promise<void> {
    const config = await readConfigFile();
    const i18n = await readI18nFile(config.language);
    const redisServerPersistance = await RedisServerStatusPersistance.init(config.redis);
    const kubernetes = await KubernetesProviderService.init(config.kubernetes);
    const minecraftServerStatusProviderService = new MinecraftServerStatusProviderService(config);
    const minecraftServerService = new MinecraftServerService(minecraftServerStatusProviderService, redisServerPersistance, kubernetes, config);
    const authProviderService = new AuthProviderService(config.roles);
    minecraftServerService.start();
    console.log(`discworldmc started successfully`);

    switch (config.interface) {
        case 'cli':
            console.warn('The cli interface is only for testing purposes!');
            new CliInterface(minecraftServerService).start();
            break;
        case 'discord':
            throw new Error('Discord interface is not implemented yet');
        case 'http':
            console.warn('The http interface is only for testing purposes! It is not secure! Don\'t expose it to the internet! ');
            new HttpInterface(minecraftServerService).start();
            break;
        default:
            throw new Error(`Interface ${config.interface} is not supported`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
