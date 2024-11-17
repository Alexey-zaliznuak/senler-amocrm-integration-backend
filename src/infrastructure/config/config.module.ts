import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './config.app-config';
import { CustomConfig } from './config.custom-config';

@Module({
  imports: [
    ConfigModule.forFeature(() => AppConfig),
  ],
  providers: [CustomConfig], // Регистрируем прокси
  exports: [CustomConfig], // Экспортируем прокси
})
export class CustomConfigModule {}
