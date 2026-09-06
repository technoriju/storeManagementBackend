import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import helmet from "helmet";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3000);
  const apiPrefix = configService.get<string>("API_PREFIX", "api/v1");

  // Helmet for security headers
  app.use(helmet());

  // API prefix
  app.setGlobalPrefix(apiPrefix);

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global transform interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS
  app.enableCors();

  // Swagger setup
  const { DocumentBuilder, SwaggerModule } = require("@nestjs/swagger");
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Billing Software API")
    .setDescription("The billing software API description")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
