import 'reflect-metadata';
import * as fs from 'fs';
import { parse as parseJson } from 'json5';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { I18n, Languages } from '../src/i18n';

describe('I18N', () => {
    describe('Language file should match declaration', () => {
        Languages.forEach((language) => {
            it(language, async () => {
                const i18nFilePath = `./i18n/${language}.json`;
                if (!fs.existsSync(i18nFilePath)) {
                    throw new Error(`The language ${language} is not supported`);
                }
                const i18n = parseJson(fs.readFileSync(i18nFilePath, 'utf8'));
                const i18nInstance = plainToClass(I18n, i18n);
                await validateOrReject(i18nInstance);
            });
        });
    });
});
