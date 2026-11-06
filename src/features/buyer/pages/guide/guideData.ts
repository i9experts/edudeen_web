export type Need = 'required' | 'optional' | 'recommended';

export interface GuideField { name: string; need: Need; tip: string }
export interface GuideStep {
  id: string;
  title: string;
  /** One-line summary shown on the flow chip and under the title. */
  summary: string;
  /** Rough time the step takes. */
  time?: string;
  points?: string[];
  fields?: GuideField[];
  /** Mistakes to avoid. */
  avoid?: string[];
  /** File name in /public/guide (without folder). Hidden if the file is missing. */
  img?: string;
  imgAlt?: string;
  link?: { label: string; to: string };
}
export interface GuideSection { id: string; title: string; intro: string; steps: GuideStep[] }

export const BUYER_SECTIONS: GuideSection[] = [
  {
    id: 'buyer-shop',
    title: 'Find and choose',
    intro: 'From the home page to the right resource in about a minute.',
    steps: [
      {
        id: 'b-find', title: 'Browse by class or subject', time: '1 min', img: 'b-browse.jpg',
        summary: 'Pick a class, a subject or type in the search box.',
        points: [
          'Use the class tiles or the Shop by subject menu on the home page.',
          'Search understands Urdu, Roman Urdu and small spelling mistakes.',
          'Filters: class, price, rating, free only, online courses. Sort by newest, price or rating.',
          'Tap the heart to save a product, or Compare to put up to 4 side by side.',
        ],
        link: { label: 'Browse everything', to: '/?browse=1' },
      },
      {
        id: 'b-product', title: 'Read the product page', time: '1 min', img: 'b-product.jpg',
        summary: 'Photos, what you get, class, delivery and the seller.',
        points: [
          '"What you get" shows file type, pages and language. Courses show lessons and duration.',
          'Check the seller card: store name, rating and reply time.',
          'Delivery row: digital items are instant; physical items show the delivery charge and whether Cash on Delivery is possible.',
          'Reviews from real buyers are under the product. Only people who bought it can review.',
        ],
      },
    ],
  },
  {
    id: 'buyer-buy',
    title: 'Buy safely',
    intro: 'Cart, checkout and the three ways to pay.',
    steps: [
      {
        id: 'b-cart', title: 'Add to cart', time: '30 sec', img: 'b-cart.jpg',
        summary: 'Items from several stores can sit in one cart.',
        points: [
          'Change quantity or remove an item. Removing shows an Undo for 5 seconds.',
          'Free products use the "Avail for free" button instead of the cart.',
          'Buy Now skips the cart and checks out one item only.',
        ],
        link: { label: 'Open my cart', to: '/cart' },
      },
      {
        id: 'b-checkout', title: 'Checkout and pay', time: '2 min', img: 'b-checkout.jpg',
        summary: 'Address (physical only), delivery, payment, review, place order.',
        points: [
          'Digital-only carts skip the address step.',
          'Card: works on USD prices. Bank transfer / wallet: send money to the Edudeen account shown, then upload the receipt. COD: pay the courier when your parcel arrives.',
          'Bank transfer orders become "paid" after the Edudeen team checks your receipt (usually within a day).',
          'Coupons, gift cards and gift wrap can be added before you pay.',
        ],
        avoid: [
          'Upload a clear photo or PDF of the receipt (jpg, png, webp, heic or pdf).',
          'Do not pay twice. A duplicate card payment is refunded automatically.',
        ],
      },
      {
        id: 'b-success', title: 'Order placed', time: '', img: 'b-order-success.jpg',
        summary: 'You see your order number, a Download button for digital items and what happens next.',
        points: ['You also get an in-app notification and an e-mail.', 'Closed the tab? Your order is always in Account > Orders.'],
      },
    ],
  },
  {
    id: 'buyer-after',
    title: 'After you buy',
    intro: 'Download, track, review and get help.',
    steps: [
      {
        id: 'b-library', title: 'Downloads and My Library', img: 'b-library.jpg',
        summary: 'Every file and course you own, in one place.',
        points: [
          'Filter by type, sort, or show the last 30 days.',
          'Link expired? Press "Re-send download link".',
          'Online courses open in the course player. You get a certificate when you finish.',
        ],
        link: { label: 'My Library', to: '/account/downloads' },
      },
      {
        id: 'b-orders', title: 'Track orders', img: 'b-orders.jpg',
        summary: 'Status line shows placed, packed, shipped, delivered.',
        points: ['Each seller\'s parcel has its own status and tracking link.', 'With COD you pay per parcel when it arrives.'],
        link: { label: 'My Orders', to: '/account/orders' },
      },
      {
        id: 'b-refund', title: 'Refunds and returns', img: 'b-order-detail.jpg',
        summary: 'Open the order and press the refund request on the item.',
        points: [
          'Digital files: refundable only if you have not downloaded them.',
          'Physical items: after delivery. Choose a reason, write a short note (20+ characters) and add up to 3 photos if damaged.',
          'The seller and Edudeen review your request. You are notified of the decision.',
        ],
        link: { label: 'Returns policy', to: '/returns' },
      },
      {
        id: 'b-account', title: 'Your account', img: 'b-account.jpg',
        summary: 'Profile, addresses, notifications, children, Premium.',
        points: [
          'My children: add up to 8 children and shop by their class.',
          'Edudeen Premium: member prices on many products and early access to sales.',
          'Notifications: choose which updates you want. Reminders by WhatsApp/SMS are coming soon.',
        ],
        link: { label: 'Edudeen Premium', to: '/premium' },
      },
    ],
  },
];

export const SELLER_SECTIONS: GuideSection[] = [
  {
    id: 'seller-start',
    title: 'Open your store',
    intro: 'Account to a live store in about 10 minutes. You need your logo and a short description ready.',
    steps: [
      {
        id: 's-register', title: 'Create your seller account', time: '1 min', img: 's-register.jpg',
        summary: 'Choose Seller on the sign-up page and verify your e-mail.',
        points: [
          'Already a buyer? Open the profile menu > Sell on Edudeen. Your e-mail and password stay the same.',
          'Enter the 6-digit code sent to your e-mail.',
        ],
        link: { label: 'Sell on Edudeen', to: '/become-a-seller' },
      },
      {
        id: 's-plan', title: 'Choose a plan', time: '1 min', img: 's-become-plans.jpg',
        summary: 'Monthly or yearly plans; a free trial may be available once per seller.',
        points: [
          'Edudeen also takes a small platform fee on each sale (set by Edudeen, shown in your earnings).',
          'Free trial: no card needed. When it ends your listings are hidden until you pick a plan; they come back when a plan is active.',
        ],
      },
      {
        id: 's-store', title: 'Onboarding: 5 short steps', time: '5 min', img: 's-onboard-store.jpg',
        summary: 'Store Info, Plan & Payment, Seller Type, What You Sell, Review.',
        fields: [
          { name: 'Store name and short description', need: 'required', tip: 'Buyers see this on your store page. 30+ characters of bio helps you appear in Featured sellers.' },
          { name: 'Logo and cover', need: 'recommended', tip: 'A square logo and a wide cover. Stores with both look more trusted.' },
          { name: 'Plan & Payment', need: 'required', tip: 'Card for paid plans. The free trial skips this step.' },
          { name: 'Seller type', need: 'required', tip: 'Creator, Educator, Bookseller, Publisher/Institute, Tutor or Mix.' },
          { name: 'What you sell', need: 'required', tip: 'Books & school supplies (physical) and/or digital learning resources.' },
        ],
        points: ['Your store goes live immediately after you finish. Products still need a quick check before they show.'],
      },
      {
        id: 's-dash', title: 'Finish the setup checklist', time: '2 min', img: 's-dashboard.jpg',
        summary: 'The dashboard shows what is left: profile, first product, payout method.',
        points: ['"Action required" lists orders to ship, returns, messages and questions waiting for you.', 'Add a payout method now so you are ready when your first sale clears.'],
      },
    ],
  },
  {
    id: 'seller-product',
    title: 'Upload a product',
    intro: 'Add Product is a 6-step guide. Steps show Required or Optional. You can save a draft at any time, so nothing is lost.',
    steps: [
      {
        id: 's-p1', title: 'Step 1 · Type & basics', time: '2 min', img: 's-add-basics.jpg',
        summary: 'Physical (you ship) or Digital (buyers download). You cannot change this after publishing.',
        fields: [
          { name: 'Product type', need: 'required', tip: 'Physical = books, stationery, kits. Digital = PDFs, worksheets, audio, video, online courses.' },
          { name: 'Product title', need: 'required', tip: 'At least 10 characters, start with a capital letter. Say what it is and who it is for, e.g. "Class 5 Mathematics Worksheets Bundle".' },
          { name: 'Description', need: 'required', tip: 'At least 20 characters: what is included, the learning goal, how to use it at home or in class.' },
        ],
        avoid: ['Phone numbers, WhatsApp, e-mail or links in the text. The listing is then held for manual review.', 'Vague titles like "Notes" or "Book".'],
      },
      {
        id: 's-p2', title: 'Step 2 · Photos & files', time: '3 min', img: 's-add-files.jpg',
        summary: 'Pictures buyers see, and the files they receive.',
        fields: [
          { name: 'Photos', need: 'optional', tip: 'Up to 20. Select many at once, drag to reorder. The first photo is the cover.' },
          { name: 'Your files (digital)', need: 'required', tip: 'PDF, audio, video or a ZIP. Large files are fine. Online courses use the Course builder (video lessons).' },
          { name: 'Free sample (digital)', need: 'required', tip: 'Needed to publish (not for drafts). Edudeen builds a stamped preview from it for buyers.' },
        ],
      },
      {
        id: 's-p3', title: 'Step 3 · Price & stock', time: '1 min', img: 's-add-price.jpg',
        summary: 'Price in your store currency. Enter 0 for a free resource.',
        fields: [
          { name: 'Price', need: 'required', tip: 'PKR in whole rupees. A strike-through "compare at" price must be higher than the price.' },
          { name: 'Stock quantity (physical)', need: 'required', tip: 'Whole number, 0 to 100,000, or Unlimited.' },
          { name: 'Shipping weight (physical)', need: 'required', tip: 'Used for the delivery charge. 1 g to 50 kg.' },
          { name: 'Parcel type and packed size', need: 'optional', tip: 'Document, standard, fragile or bulky. Length × width × height in cm.' },
          { name: 'Licence, download limit, link expiry (digital)', need: 'optional', tip: 'Personal licence is the default. You can add classroom and school licences.' },
        ],
      },
      {
        id: 's-p4', title: 'Step 4 · Category & details', time: '2 min', img: 's-add-class.jpg',
        summary: 'Where it appears and who it is for.',
        fields: [
          { name: 'Category and sub-category', need: 'required', tip: 'Any main category, then a narrower one so buyers find it.' },
          { name: 'Product card style', need: 'required', tip: 'Book look for books and printables, plain photo for toys and other items.' },
          { name: 'Class range', need: 'required', tip: 'Required to publish digital products (optional for physical). Example: Class 3 to Class 5.' },
          { name: 'Board, age, language, tags', need: 'optional', tip: 'Press Enter after each tag so it is saved.' },
        ],
      },
      {
        id: 's-p5', title: 'Step 5 · Offers & earnings', time: '1 min', img: 's-add-offers.jpg',
        summary: 'Optional. Join a platform sale or give Premium members a discount.',
        points: ['A product can be in a platform sale or have a Premium discount, not both.', 'The calculator shows what you earn after the platform fee.'],
      },
      {
        id: 's-p6', title: 'Step 6 · Review & publish', time: '1 min', img: 's-add-review.jpg',
        summary: 'Missing items are listed with a link to fix them.',
        points: [
          'Publish now, Schedule a date (Pakistan time), or Save draft.',
          'Your first listings are checked by the Edudeen team, usually within a day. Paid plans publish directly.',
          'A live preview card shows exactly how buyers will see it.',
        ],
      },
      {
        id: 's-bulk', title: 'Many products at once: Bulk upload', time: '', img: 's-bulk.jpg',
        summary: 'Drop up to 50 files, fill one row per product, create them all.',
        points: ['Choose Digital or Physical. Cover photos are matched by file name.', 'Rows with problems stay red and are not created. Your work is auto-saved on this device.'],
      },
    ],
  },
  {
    id: 'seller-sell',
    title: 'Run your orders',
    intro: 'From a new order to money in your wallet.',
    steps: [
      {
        id: 's-orders', title: 'New orders', img: 's-orders.jpg',
        summary: 'Orders to ship are counted on your dashboard and in the Orders menu.',
        points: ['Open an order, pack it, add tracking and press Mark shipped. Ship within 48 hours of payment to keep your Store Health high.', 'Digital orders are delivered automatically.'],
      },
      {
        id: 's-ship', title: 'Delivery settings', img: 's-shipping.jpg',
        summary: 'Set where you ship from and how you charge delivery.',
        points: ['Store Settings > Ships from (city and province) gives correct delivery charges.', 'You can charge your own flat fee or free over an amount, offer gift wrap, and allow Cash on Delivery.'],
      },
      {
        id: 's-cod', title: 'Cash on Delivery', img: 's-order-detail.jpg',
        summary: 'Cash is confirmed per parcel after it is shipped.',
        points: ['When your own rider collects the cash, press Mark paid after delivery. Edudeen then deducts its platform fee from your wallet.', 'If Edudeen collects the cash, you are credited after Edudeen receives it.'],
      },
      {
        id: 's-money', title: 'Earnings and payouts', img: 's-finance.jpg',
        summary: 'Sales go to your wallet, then you request a payout.',
        points: [
          'Each paid sale is credited minus the platform fee, and clears after a few days.',
          'Add a payout method (bank or wallet). Type the full account number once; only the last 4 digits are shown afterwards.',
          'Request a payout. The Edudeen team approves and sends it.',
        ],
      },
    ],
  },
  {
    id: 'seller-grow',
    title: 'Grow your store',
    intro: 'Optional tools once your first products are live.',
    steps: [
      { id: 's-custom', title: 'Customize your store', img: 's-customize.jpg', summary: 'Pick featured products, show New arrivals and Best sellers.', points: ['Save a draft, preview on phone and desktop, then Publish.'] },
      { id: 's-mkt', title: 'Marketing and platform sales', img: 's-marketing.jpg', summary: 'Join Edudeen sales, make coupons and discounts.', points: ['Apply now on a running sale and tick the products to include.'] },
      { id: 's-health', title: 'Store Health', img: 's-health.jpg', summary: 'Late dispatch, returns, reply speed and rating against targets.', points: ['Numbers appear after 10 samples so they are fair.'] },
      { id: 's-students', title: 'Students and downloads', img: 's-students.jpg', summary: 'See who bought your courses and files, and export a list.', points: [] },
    ],
  },
];

export const QUICK_FAQ: { q: string; a: string; audience: 'buyer' | 'seller' }[] = [
  { audience: 'seller', q: 'Why is my product not visible?', a: 'New listings wait for a quick Edudeen check (usually within a day), or your plan has ended. Check Products > status.' },
  { audience: 'seller', q: 'When do I get my money?', a: 'After the sale clears in your wallet, request a payout. Edudeen approves and sends it.' },
  { audience: 'buyer', q: 'My bank transfer is not approved yet.', a: 'The team checks receipts manually, usually within a day. Re-upload a clearer receipt if it was rejected.' },
  { audience: 'buyer', q: 'My download link stopped working.', a: 'Open My Library and press Re-send download link.' },
];
