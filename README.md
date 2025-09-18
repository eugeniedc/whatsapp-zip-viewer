# WhatsApp Export ZIP Viewer

A beautiful, local viewer for WhatsApp chat exports (ZIP files) with a modern WhatsApp-like interface.  
- Upload a WhatsApp .zip export file.
- View messages locally with search and date range filtering.
- All processing is done in your browser; no data leaves your device.

## Features

- **💬 WhatsApp-like UI:** Modern design with WhatsApp's signature green color scheme and chat bubble interface
- **📱 Responsive Design:** Works seamlessly on desktop and mobile devices
- **🔒 Privacy First:** All processing is local—no server needed, your data stays on your device
- **⚡ Fast Search:** Instantly search messages and senders with real-time filtering
- **📅 Date Filtering:** Filter messages by date range to find specific conversations
- **🎨 Modern Components:** Built with shadcn/ui components for a polished, accessible interface
- **💾 ZIP Upload:** Supports WhatsApp chat export ZIP files
- **👥 Chat Bubbles:** Messages displayed as realistic chat bubbles with sender avatars
- **🕒 Message Timestamps:** Full timestamp display in WhatsApp style

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
   The application will be available at `http://localhost:5173`

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview the production build**
   ```bash
   npm run preview
   ```

## Usage

1. Open the app in your browser
2. Click "Choose WhatsApp Export ZIP" to upload your WhatsApp export `.zip` file
3. Browse your messages in the familiar WhatsApp-style interface
4. Use the search box to find specific messages or senders
5. Filter by date range using the date pickers
6. All processing happens locally - your messages never leave your device

## UI Components

This app uses **shadcn/ui** components for a modern, accessible interface:

- **Card Components:** For structured layout and content organization
- **Input & Button:** Styled form elements with focus states and hover effects  
- **Label:** Accessible form labels
- **Date Picker:** Easy date selection for filtering
- **Custom Components:** WhatsApp-style chat bubbles and avatars

### Design Features

- **WhatsApp Green Theme:** Uses authentic WhatsApp colors (#25D366)
- **Chat Bubble Design:** Realistic message bubbles with proper spacing
- **Avatar Placeholders:** Colored circles with sender initials
- **Gradient Backgrounds:** Beautiful green gradients matching WhatsApp
- **Responsive Layout:** Works on all screen sizes
- **Smooth Animations:** Hover effects and focus states

## Tech Stack

- **React & TypeScript** - Modern frontend framework with type safety
- **Vite** - Fast development server and build tool  
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible React components
- **JSZip** - Client-side ZIP file processing
- **class-variance-authority** - For component variant styling
- **clsx & tailwind-merge** - Utility functions for className handling

## Development

The project uses modern development tools and practices:

- **Hot Module Replacement** with Vite for instant updates
- **TypeScript** for type safety and better developer experience
- **PostCSS** with Tailwind CSS for styling
- **ESLint** ready configuration for code quality

## Privacy & Security

- ✅ **100% Local Processing** - No data sent to servers
- ✅ **No Analytics** - No tracking or data collection
- ✅ **Secure by Design** - Files processed entirely in your browser
- ✅ **No Storage** - Files are not saved or cached

