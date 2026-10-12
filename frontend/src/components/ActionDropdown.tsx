import React, { useState } from 'react';
import type { FileDoc, ActionType } from '../types';
import { actionsDropdownItems } from '../constants';
import { renameFile, updateFileUsers, deleteFile, getDownloadUrl } from '../api/files';
import { toast } from 'sonner';
import { convertFileSize, formatDateTime } from '../utils';

interface ActionDropdownProps {
  file: FileDoc;
  onRefresh?: () => void;
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({ file, onRefresh }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Rename state
  const [newName, setNewName] = useState(file.name.replace(/\.[^/.]+$/, ''));

  // Share state
  const [emailInput, setEmailInput] = useState('');
  const [sharedEmails, setSharedEmails] = useState<string[]>(file.users || []);

  const handleActionClick = (actionValue: string) => {
    setIsDropdownOpen(false);
    if (actionValue === 'download') {
      window.open(file.url || getDownloadUrl(file), '_blank');
      return;
    }
    setActiveModal(actionValue as ActionType);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsLoading(true);
    try {
      await renameFile(file._id || file.$id || '', newName.trim(), file.extension);
      toast.success('File renamed successfully');
      setActiveModal(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (trimmed && !sharedEmails.includes(trimmed)) {
      setSharedEmails([...sharedEmails, trimmed]);
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setSharedEmails(sharedEmails.filter((e) => e !== email));
  };

  const handleSaveShare = async () => {
    setIsLoading(true);
    try {
      await updateFileUsers(file._id || file.$id || '', sharedEmails);
      toast.success('Sharing settings updated');
      setActiveModal(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update sharing settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteFile(file._id || file.$id || '');
      toast.success('File deleted successfully');
      setActiveModal(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete file');
    } finally {
      setIsLoading(false);
    }
  };

  const ownerName =
    typeof file.owner === 'object' && file.owner?.fullName
      ? file.owner.fullName
      : 'User';

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-1 rounded-full hover:bg-light-300 transition-colors"
          title="More options"
        >
          <img
            src="/assets/icons/dots.svg"
            alt="actions"
            className="w-5 h-5 opacity-70"
          />
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            <ul className="absolute right-0 top-8 z-50 min-w-44 bg-white border border-light-300 rounded-xl shadow-drop-1 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
              {actionsDropdownItems.map((item) => (
                <li
                  key={item.value}
                  onClick={() => handleActionClick(item.value)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                    item.value === 'delete'
                      ? 'text-red hover:bg-red-50'
                      : 'text-light-100 hover:bg-light-400'
                  }`}
                >
                  <img src={item.icon} alt={item.label} className="w-4 h-4" />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Modal Dialogs */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-drop-2 animate-in fade-in zoom-in-95 relative">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-light-300 transition-colors"
            >
              <img src="/assets/icons/close-dark.svg" alt="close" className="w-5 h-5" />
            </button>

            {/* RENAME MODAL */}
            {activeModal === 'rename' && (
              <form onSubmit={handleRename}>
                <h3 className="h3 text-light-100 mb-1">Rename File</h3>
                <p className="caption text-light-200 mb-4">
                  Enter a new name for your file
                </p>

                <div className="flex items-center gap-2 border border-light-300 rounded-xl px-3 py-2.5 mb-5 focus-within:border-brand">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-sm outline-none text-light-100"
                    placeholder="Enter file name"
                    autoFocus
                  />
                  <span className="text-sm text-light-200 font-medium">
                    .{file.extension}
                  </span>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-sm text-light-100 hover:bg-light-400 rounded-full font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !newName.trim()}
                    className="primary-btn px-6 py-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Rename'}
                  </button>
                </div>
              </form>
            )}

            {/* DETAILS MODAL */}
            {activeModal === 'details' && (
              <div>
                <h3 className="h3 text-light-100 mb-4">File Details</h3>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between py-2 border-b border-light-300">
                    <span className="text-light-200">Format:</span>
                    <span className="font-medium uppercase text-light-100">{file.extension}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-light-300">
                    <span className="text-light-200">Size:</span>
                    <span className="font-medium text-light-100">{convertFileSize(file.size)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-light-300">
                    <span className="text-light-200">Owner:</span>
                    <span className="font-medium text-light-100">{ownerName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-light-300">
                    <span className="text-light-200">Last Modified:</span>
                    <span className="font-medium text-light-100">
                      {formatDateTime(file.updatedAt || file.createdAt || file.$createdAt)}
                    </span>
                  </div>
                  <div className="py-2">
                    <span className="text-light-200 block mb-1">Shared with:</span>
                    {file.users && file.users.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {file.users.map((email) => (
                          <span
                            key={email}
                            className="text-xs bg-light-300 text-light-100 px-2.5 py-1 rounded-full"
                          >
                            {email}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-light-200 italic">No one else</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="primary-btn px-6 py-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* SHARE MODAL */}
            {activeModal === 'share' && (
              <div>
                <h3 className="h3 text-light-100 mb-1">Share File</h3>
                <p className="caption text-light-200 mb-4">
                  Add email addresses of users you want to share with
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                    className="flex-1 border border-light-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand text-light-100"
                    placeholder="Enter email address"
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="px-4 py-2 bg-light-300 hover:bg-light-400 text-light-100 rounded-xl text-sm font-medium"
                  >
                    Add
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 mb-5">
                  {sharedEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2 bg-light-400 rounded-lg text-sm text-light-100"
                    >
                      <span className="truncate">{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-red hover:underline text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {sharedEmails.length === 0 && (
                    <p className="text-xs text-light-200 italic">No users added yet</p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-sm text-light-100 hover:bg-light-400 rounded-full font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveShare}
                    disabled={isLoading}
                    className="primary-btn px-6 py-2 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* DELETE MODAL */}
            {activeModal === 'delete' && (
              <div>
                <h3 className="h3 text-red mb-2">Delete File</h3>
                <p className="body-2 text-light-100 mb-6">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-dark-100">&quot;{file.name}&quot;</span>?
                  This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 text-sm text-light-100 hover:bg-light-400 rounded-full font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="bg-red hover:bg-red/90 text-white px-6 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ActionDropdown;
