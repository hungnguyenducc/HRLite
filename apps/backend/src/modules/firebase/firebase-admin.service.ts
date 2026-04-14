import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private auth: Auth;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (getApps().length === 0) {
      const app: App = initializeApp({
        credential: cert({
          projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.configService
            .get<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
        }),
      });
      this.auth = getAuth(app);
    } else {
      this.auth = getAuth();
    }
  }

  getAuth(): Auth {
    return this.auth;
  }
}
