// Run: npm run test:rules
import assert from 'node:assert/strict';
import { externalVideoEmbed, isAllowedExternalVideo } from '../src/utils/externalVideo.ts';
import { courseSummaryText, normalizeDeliveryFormat } from '../src/utils/deliveryFormat.ts';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok  ', name); };

t('YouTube links become youtube-nocookie embeds', () => {
  assert.equal(externalVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ').embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  assert.equal(externalVideoEmbed('https://youtu.be/dQw4w9WgXcQ').provider, 'youtube');
  assert.equal(externalVideoEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ').provider, 'youtube');
});
t('Vimeo links (incl. unlisted hash) become player embeds', () => {
  assert.equal(externalVideoEmbed('https://vimeo.com/123456789').embedUrl, 'https://player.vimeo.com/video/123456789');
  assert.equal(externalVideoEmbed('https://vimeo.com/123456789/abc123def4').embedUrl, 'https://player.vimeo.com/video/123456789?h=abc123def4');
});
t('anything else is refused (http, other hosts, lookalikes, junk)', () => {
  for (const bad of ['http://youtube.com/watch?v=dQw4w9WgXcQ', 'https://evil.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'javascript:alert(1)', 'not a url', '', null, undefined, 'https://www.youtube.com/watch?v=<script>']) {
    assert.equal(isAllowedExternalVideo(bad), false, String(bad));
  }
});
t('course summary text and format fallback', () => {
  assert.equal(courseSummaryText({ lessonCount: 12, totalMinutes: 45 }), '12 lessons · 45 min');
  assert.equal(courseSummaryText({ lessonCount: 1, totalMinutes: 120 }), '1 lesson · 2 h');
  assert.equal(courseSummaryText({ lessonCount: 0, totalMinutes: 5 }), '');
  assert.equal(normalizeDeliveryFormat(undefined), 'download');
  assert.equal(normalizeDeliveryFormat('live_class'), 'live_class');
});
console.log(`${n} course helper checks passed`);
