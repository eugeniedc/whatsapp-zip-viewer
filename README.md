# WhatsApp Export ZIP Viewer

A local viewer for WhatsApp chat exports (ZIP files).  
- Upload a WhatsApp .zip export file.
- View messages locally, with search and date range filtering.
- All processing is done in your browser; no data leaves your device.

## Features

- **ZIP Upload:** Supports WhatsApp chat export ZIP files.
- **Search:** Instantly search messages and senders.
- **Date Range:** Filter messages by date.
- **Fast & Private:** All processing is local—no server needed.
- **Pixel Owl Favicon:** Includes a custom pixel owl favicon for fun!

## Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/eugeniedc/whatsapp-zip-viewer.git
   cd whatsapp-zip-viewer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173/`

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

## Usage

- Open the app in your browser.
- Upload your WhatsApp export `.zip` file.
- Search/filter messages instantly and privately.

## Tech Stack

- React & TypeScript
- [Vite](https://vitejs.dev/) for fast development and building
- [jszip](https://www.npmjs.com/package/jszip) for ZIP extraction
- Custom UI components for a clean interface

## Development

This project uses Vite for fast development and hot module replacement. The development server provides instant feedback when making changes to the code.

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build locally

