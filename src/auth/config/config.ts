import { IsString } from 'class-validator';

export class AuthRoleConfig {
    @IsString()
    declare roleId: string;
    
    @IsString({each: true})
    declare permissions: string[];
}
