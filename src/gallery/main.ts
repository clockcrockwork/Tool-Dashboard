/** Design Pattern Gallery の入口（gallery.html）。`npm run gallery` で開く。本番ビルド（index.html）には入らない。 */
import { createApp } from 'vue';
import '../app/styles/fonts';
import '../app/styles/dashboard.css';
import './gallery.css';
import './gallery-live.css';
import GalleryApp from './GalleryApp.vue';

createApp(GalleryApp).mount('#gallery');
