import { plainToClass, plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import * as fs from 'fs';
import { } from 'fs';
import { join as joinPath } from 'path';
import 'reflect-metadata';
import { AuthProviderService } from './auth/service/auth-provider-service';
import { Configuration } from './configuration';
import { DiscordService } from './discord/discord-service';
import { MinecraftServerService } from './domain/service/minecraft-server-service';
import { I18n } from './i18n';
import { KubernetesProviderService } from './kubernetes/kubernetes-provider-service';
import { MinecraftServerStatusProviderService } from './minecraft/minecraft-server-status-provider-service';
import { RedisServerStatusPersistance } from './redis/redis-server-status-persistance';
import { CliInterface } from './testing/cli-interface';
import { HttpInterface } from './testing/http-interface';
import { parse as parseJson } from 'json5';

async function readConfigFile(): Promise<Configuration> {
    const configFilePath = process.env.CONFIG_FILE_PATH;
    if (!configFilePath) {
        throw new Error('CONFIG_FILE_PATH is not set');
    }
    if (!fs.existsSync(configFilePath)) {
        throw new Error(`File ${configFilePath} does not exist`);
    }
    const config = parseJson(fs.readFileSync(configFilePath, 'utf8'));
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
    const i18n = parseJson(fs.readFileSync(i18nFilePath, 'utf8'));
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
            if (!config.discord) {
                throw new Error('For discord interface the discord configuration key is required!');
            }
            const discordService = new DiscordService(config.discord, minecraftServerService, i18n, authProviderService);
            await discordService.start();
            break;
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
