import type { Photo } from '@/types/photo-type';
import imageCompression from 'browser-image-compression';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '@/config/firebase';
import { toMillis } from '@/helpers/firestore';
import { photoSchema } from '@/types/photo-type';

const photosCollection = collection(db, 'photos');

/**
 * Fotos de celular chegam com 6–12 MB. Sem isso, o mural de um encontro
 *  sozinho estoura a cota gratuita do Storage e demora para carregar no 4G.
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.2,
  maxWidthOrHeight: 2000,
  useWebWorker: true,
};

function parsePhoto(id: string, data: Record<string, unknown> | undefined): Photo | null {
  if (!data)
    return null;

  const result = photoSchema.safeParse({ ...data, id, createdAt: toMillis(data.createdAt) });

  if (!result.success) {
    console.error('[photoService] foto fora do schema', { id, issues: result.error.issues });
    return null;
  }

  return result.data;
}

/**
 * Nome único, para duas pessoas subindo `IMG_0001.jpg` do mesmo encontro não
 *  sobrescreverem uma a foto da outra.
 */
function uniqueStoragePath(eventId: string, fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, '-').toLowerCase();
  const folder = eventId || 'geral';
  return `photos/${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
}

export type PhotoUploadInput = {
  file: File;
  eventId: string;
  eventTitle: string;
  caption: string;
  uploadedBy: string;
  uploadedByName: string;
};

export const photoService = {
  /**
   * Sobe o arquivo e só então registra o documento.
   *
   * Se a escrita no Firestore falhar, o objeto recém-enviado é apagado: um
   * arquivo órfão no bucket é um que ninguém consegue ver na tela nem remover
   * pelo app — ele só aparece na fatura.
   */
  async uploadPhoto(input: PhotoUploadInput): Promise<Photo> {
    const compressed = await imageCompression(input.file, COMPRESSION_OPTIONS);
    const storagePath = uniqueStoragePath(input.eventId, input.file.name);
    const objectRef = ref(storage, storagePath);

    await uploadBytes(objectRef, compressed, { contentType: compressed.type || input.file.type });
    const downloadUrl = await getDownloadURL(objectRef);

    try {
      const reference = await addDoc(photosCollection, {
        eventId: input.eventId,
        eventTitle: input.eventTitle,
        caption: input.caption,
        downloadUrl,
        storagePath,
        uploadedBy: input.uploadedBy,
        uploadedByName: input.uploadedByName,
        createdAt: serverTimestamp(),
      });

      return {
        id: reference.id,
        eventId: input.eventId,
        eventTitle: input.eventTitle,
        caption: input.caption,
        downloadUrl,
        storagePath,
        uploadedBy: input.uploadedBy,
        uploadedByName: input.uploadedByName,
        createdAt: Date.now(),
      };
    }
    catch (error) {
      await deleteObject(objectRef).catch(() => undefined);
      throw error;
    }
  },

  async listPhotos(max = 120): Promise<Photo[]> {
    const snapshot = await getDocs(query(photosCollection, orderBy('createdAt', 'desc'), limitTo(max)));
    return snapshot.docs
      .map(document => parsePhoto(document.id, document.data()))
      .filter((photo): photo is Photo => photo !== null);
  },

  async listByEvent(eventId: string): Promise<Photo[]> {
    const snapshot = await getDocs(query(
      photosCollection,
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc'),
    ));
    return snapshot.docs
      .map(document => parsePhoto(document.id, document.data()))
      .filter((photo): photo is Photo => photo !== null);
  },

  async updateCaption(id: string, caption: string): Promise<void> {
    await updateDoc(doc(db, 'photos', id), { caption });
  },

  /**
   * Apaga o documento e o arquivo. O objeto primeiro: se o doc sumisse antes,
   *  o `storagePath` iria junto e o arquivo ficaria inalcançável.
   */
  async deletePhoto(photo: Photo): Promise<void> {
    await deleteObject(ref(storage, photo.storagePath)).catch((error) => {
      // Um arquivo já ausente não deve impedir a limpeza do índice.
      console.warn('[photoService] objeto não removido do Storage', { path: photo.storagePath, error });
    });
    await deleteDoc(doc(db, 'photos', photo.id));
  },
};
