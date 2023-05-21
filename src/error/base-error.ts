import { I18n } from '../i18n';

export abstract class BaseError extends Error {
    abstract i18nEntry: keyof I18n['errors'];
}
