declare const gapi: any;
declare const google: any;

export interface PickerFileResult {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

/**
 * Open Google Drive Picker modal for selecting Sheets or Presentations
 */
export function openGoogleDrivePicker({
  accessToken,
  mimeType,
  title,
  onSelect,
}: {
  accessToken: string;
  mimeType: 'spreadsheet' | 'presentation';
  title: string;
  onSelect: (file: PickerFileResult) => void;
}) {
  if (typeof gapi === 'undefined') {
    alert('Google API library is loading. Please try again in a few seconds.');
    return;
  }

  gapi.load('picker', () => {
    try {
      const viewId =
        mimeType === 'spreadsheet'
          ? google.picker.ViewId.SPREADSHEETS
          : google.picker.ViewId.PRESENTATIONS;

      const view = new google.picker.DocsView(viewId)
        .setSelectFolderEnabled(false)
        .setMode(google.picker.DocsViewMode.LIST);

      const picker = new google.picker.PickerBuilder()
        .setAppId('board-deck-generator')
        .setOAuthToken(accessToken)
        .addView(view)
        .setTitle(title)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            if (doc) {
              onSelect({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                url: doc.url || `https://docs.google.com/open?id=${doc.id}`,
              });
            }
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error('Error launching Google Drive Picker:', err);
      alert('Unable to launch Google Drive Picker. You can also paste the document URL directly.');
    }
  });
}
