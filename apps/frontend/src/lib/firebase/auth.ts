import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { firebaseAuth } from './config';

export async function firebaseSignUp(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  const idToken = await credential.user.getIdToken();
  return { idToken, uid: credential.user.uid, user: credential.user };
}

export async function firebaseSignIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const idToken = await credential.user.getIdToken();
  return { idToken, uid: credential.user.uid };
}

export async function firebaseSignOut() {
  return signOut(firebaseAuth);
}

export async function firebaseGoogleSignIn() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(firebaseAuth, provider);
  const idToken = await credential.user.getIdToken();
  return {
    idToken,
    uid: credential.user.uid,
    displayName: credential.user.displayName,
    photoUrl: credential.user.photoURL,
  };
}

export async function firebaseResetPassword(email: string) {
  await sendPasswordResetEmail(firebaseAuth, email);
}

export async function firebaseChangePassword(currentPassword: string, newPassword: string) {
  const user = firebaseAuth.currentUser;
  if (!user || !user.email) {
    throw new Error('Chưa đăng nhập');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
