/*global chrome*/
import React, { useEffect, useState, useCallback } from 'react';

import { CssBaseline, IconButton, LinearProgress, linearProgressClasses, Snackbar, Tooltip, Typography } from '@mui/material';
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/system';
import { DataGrid, GridCloseIcon } from '@mui/x-data-grid';
import { Button as BsButton } from 'react-bootstrap';
import urlJoin from 'url-join';
import './App.css';
import buildColumns from './columns';
import DisboxFileManager, { FILE_DELIMITER } from './disbox-file-manager';
import { getAvailableFileName, pickLocationAsWritable } from './file-utils.js';
import NavigationBar from './NavigationBar';
import PathParts from './PathParts';
import SearchBar from './SearchBar';
import ThemeSwitch from './ThemeSwitch';
import pako from 'pako';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
  root: {
    padding: '6px 16px',
  },
});

const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: theme.palette.mode === 'light' ? '#1a90ff' : '#308fe8',
  },
}));

function App() {
  const [fileManager, setFileManager] = useState(null);
  const [rows, setRows] = useState([]);
  const [theme, setTheme] = useState(true);
  const [path, setPath] = useState(null);
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [currentAction, setCurrentAction] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(-1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const showError = (message) => {
    setSnackbar({ open: true, message });
  };

  useEffect(() => {
    const webhookUrl = localStorage.getItem('webhookUrl');
    async function init() {
      if (webhookUrl) {
        const manager = await DisboxFileManager.create(webhookUrl);
        setFileManager(manager);
        setRows(Object.values(manager.getChildren('')));
        setPath('');
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (progressValue >= 0) {
      setShowProgress(true);
    }

    if (progressValue === 100) {
      const hideTimer = setTimeout(() => {
        setShowProgress(false);
      }, 1500);
      const resetTimer = setTimeout(() => {
        setProgressValue(-1);
        setCurrentAction('');
      }, 1800);
      return () => {
        clearTimeout(hideTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [progressValue]);

  const addRow = useCallback((row) => {
    setRows((prevRows) => {
      if (prevRows.some((r) => r.path === row.path)) {
        return prevRows;
      }
      return [...prevRows, row];
    });
  }, []);

  const updateRowById = useCallback((id, row) => {
    setRows((prevRows) => prevRows.map((r) => (r.id === id ? row : r)));
  }, []);

  const deleteRowById = useCallback((id) => {
    setRows((prevRows) => prevRows.filter((r) => r.id !== id));
  }, []);

  const getRowById = useCallback((id) => rows.find((row) => row.id === id), [rows]);

  const onProgress = useCallback((value, total) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    setProgressValue(percentage);
  }, []);

  const showDirectory = useCallback(
    async (newPath) => {
      if (!fileManager) {
        return;
      }
      setPath(newPath);
      setRows(Object.values(fileManager.getChildren(newPath)));
    },
    [fileManager]
  );

  const handleDroppedFiles = useCallback(
    async (files) => {
      if (!fileManager || path === null || currentAction) {
        return;
      }

      for (const file of files) {
        const fileName = await getAvailableFileName(fileManager, path, file.name);
        const filePath = `${path}${FILE_DELIMITER}${fileName}`;
        setCurrentAction(`Uploading ${fileName}`);
        try {
          await fileManager.uploadFile(filePath, file, onProgress);
          const row = fileManager.getFile(filePath);
          if (row) {
            addRow(row);
          }
        } catch (e) {
          showError(`Failed to upload ${fileName}: ${e}`);
        }
      }
      setCurrentAction('');
    },
    [fileManager, path, currentAction, onProgress, addRow]
  );

  useEffect(() => {
    const overlay = document.getElementById('drag-overlay');
    if (!overlay) {
      return;
    }

    let active = false;
    let dragTimeout;

    const onDragOver = (e) => {
      e.preventDefault();
      if (path === null) {
        return;
      }
      if (!active) {
        active = true;
        overlay.style.display = 'flex';
      }
      clearTimeout(dragTimeout);
      dragTimeout = setTimeout(() => {
        active = false;
        overlay.style.display = 'none';
      }, 150);
    };

    const onDrop = async (e) => {
      e.preventDefault();
      clearTimeout(dragTimeout);
      active = false;
      overlay.style.display = 'none';
      if (path === null) {
        return;
      }
      const files = Array.from(e.dataTransfer.files);
      await handleDroppedFiles(files);
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      clearTimeout(dragTimeout);
    };
  }, [handleDroppedFiles, path]);

  const onCellEditCommit = async (params) => {
    if (params.field !== 'name') {
      return;
    }
    const row = getRowById(params.id);
    if (!row || !fileManager) {
      return;
    }

    const newValue = String(params.value || '').trim();
    if (newValue === row.name) {
      return;
    }

    if (newValue.includes(FILE_DELIMITER)) {
      showError(`File name cannot contain "${FILE_DELIMITER}".`);
      updateRowById(params.id, row);
      return;
    }

    try {
      const updated = await fileManager.renameFile(row.path, newValue);
      updateRowById(params.id, updated);
    } catch (e) {
      showError(`Failed to rename file: ${e}`);
      updateRowById(params.id, row);
    }
  };

  const onCellDoubleClick = async (params) => {
    if (params.field === 'name') {
      return;
    }
    if (params.row.type === 'directory') {
      await showDirectory(params.row.path);
    }
  };

  const onDeleteFileClick = async (params) => {
    if (currentAction || !fileManager) {
      return;
    }
    if (params.row.type !== 'directory' && !window.confirm(`Are you sure you want to delete ${params.row.name}?`)) {
      return;
    }
    setCurrentAction(`Deleting ${params.row.name}`);
    try {
      await fileManager.deleteFile(params.row.path, onProgress);
      deleteRowById(params.row.id);
    } catch (e) {
      showError(`Failed to delete file: ${e}`);
    } finally {
      setCurrentAction('');
    }
  };

  const onUploadFileClick = async (event) => {
    if (currentAction || !fileManager || path === null) {
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileName = await getAvailableFileName(fileManager, path, file.name);
    const filePath = `${path}${FILE_DELIMITER}${fileName}`;
    setCurrentAction(`Uploading ${fileName}`);
    try {
      await fileManager.uploadFile(filePath, file, onProgress);
      const row = fileManager.getFile(filePath);
      if (row) {
        addRow(row);
      }
    } catch (e) {
      showError(`Failed to upload file: ${e}`);
    } finally {
      event.target.value = null;
      setCurrentAction('');
    }
  };

  const onDownloadFileClick = async (params) => {
    if (currentAction || !fileManager) {
      return;
    }
    setCurrentAction(`Downloading ${params.row.name}`);
    try {
      const writable = await pickLocationAsWritable(params.row.name);
      await fileManager.downloadFile(params.row.path, writable, onProgress);
    } catch (e) {
      showError(`Failed to download file: ${e}`);
    } finally {
      setCurrentAction('');
    }
  };

  const onShareFileClick = async (params) => {
    if (currentAction || !fileManager) {
      return;
    }
    if (!window.confirm('Sharing this file will create a permanent link to it. Anyone with the link will be able to download the file. Are you sure you want to share this file?')) {
      return;
    }

    setCurrentAction(`Sharing ${params.row.name}`);
    try {
      const fileName = params.row.name;
      const attachmentUrls = await fileManager.getAttachmentUrls(params.row.path);
      const stringifyAttachmentUrls = JSON.stringify(attachmentUrls);
      const encodedAttachmentUrls = pako.deflate(stringifyAttachmentUrls);
      const base64EncodedAttachmentUrls = btoa(String.fromCharCode.apply(null, encodedAttachmentUrls))
        .replace(/\+/g, '~')
        .replace(/\//g, '_')
        .replace(/=/g, '-');

      const shareUrl = encodeURI(urlJoin(window.location.href, `/file/?name=${encodeURIComponent(fileName)}&size=${params.row.size}#${base64EncodedAttachmentUrls}`));
      if (navigator.share) {
        try {
          await navigator.share({ title: fileName, url: shareUrl });
        } catch (e) {
          await navigator.clipboard.writeText(shareUrl);
          alert('File was too large to share. A link to it has been copied to your clipboard.');
        }
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('File shared successfully. A link to it has been copied to your clipboard.');
      }
    } catch (e) {
      showError(`Failed to share file: ${e}`);
    } finally {
      setCurrentAction('');
    }
  };

  const onNewFolderClick = async () => {
    if (currentAction || !fileManager || path === null) {
      return;
    }
    setCurrentAction('Creating folder');
    try {
      const folderName = await getAvailableFileName(fileManager, path, 'New Folder');
      const folderPath = `${path}${FILE_DELIMITER}${folderName}`;
      const folder = await fileManager.createDirectory(folderPath);
      if (folder) {
        addRow(folder);
      }
    } catch (e) {
      showError(`Failed to create folder: ${e}`);
    } finally {
      setCurrentAction('');
    }
  };

  const showSearchResults = (value = null) => {
    if (!fileManager) {
      return;
    }
    const searchValueToUse = value === null ? searchValue : value;
    if (!searchValueToUse) {
      return;
    }

    const file = fileManager.getFile(searchValueToUse);
    if (file && file.type === 'directory') {
      showDirectory(searchValueToUse);
      return;
    }

    const fileOptions = searchOptions
      .map((option) => fileManager.getFile(option))
      .filter(Boolean);

    setRows(fileOptions);
    setPath(null);
  };

  const safeFileManager = fileManager || {
    getFile: () => null,
    getChildren: () => ({}),
  };

  return (
    <ThemeProvider theme={theme ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
        <NavigationBar />
        <div
          id="drag-overlay"
          style={{
            display: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.55)',
            border: '4px dashed #4ade80',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: 'white',
            zIndex: 9999,
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ fontSize: '4rem' }}>📂</span>
          <span>Drop your files to upload</span>
        </div>

        <Snackbar open={showProgress} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Box sx={{ backgroundColor: 'background.paper', width: '500px', height: '60px' }}>
            <Box sx={{ width: '100%', mr: 1, ml: 1, mt: 1, mb: -0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {currentAction}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
              <Box sx={{ width: '100%', mr: 1, ml: 1 }}>
                <BorderLinearProgress variant="determinate" value={progressValue} />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">
                  {`${progressValue}%`}
                </Typography>
              </Box>
              <IconButton size="small" aria-label="close" sx={{ color: 'text.primary' }} onClick={() => setShowProgress(false)}>
                <GridCloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Snackbar>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />

        <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Select a file or directory to show them or hit enter to show all matching results" placement="bottom-end">
            <Box sx={{ width: 1, maxWidth: 420 }}>
              <SearchBar
                fileManager={fileManager}
                files={true}
                directories={true}
                advanced={true}
                rows={rows}
                search={true}
                onOptionsChanged={(options) => {
                  setSearchOptions(options);
                }}
                onChange={(value) => {
                  setSearchValue(value);
                }}
                onSelect={showSearchResults}
                onEnter={showSearchResults}
                placeholder="Search for files, directories, extensions (e.g. ext:png)"
              />
            </Box>
          </Tooltip>

          <input id="uploadFile" type="file" style={{ display: 'none' }} onChange={onUploadFileClick} />
          <BsButton
            variant="outline-primary"
            onClick={() => document.getElementById('uploadFile').click()}
            disabled={currentAction !== '' || path === null}
          >
            Upload file
          </BsButton>
          <BsButton
            variant="outline-primary"
            sx={{ ml: 1 }}
            onClick={onNewFolderClick}
            disabled={currentAction !== '' || path === null}
          >
            New Folder
          </BsButton>
        </Box>

        <PathParts path={path} fileManager={fileManager} showDirectory={showDirectory} />

        <Box sx={{ flex: 1, height: '72vh', width: '100%', p: 2 }}>
          <DataGrid
            sx={{
              width: 1,
              '& .MuiDataGrid-cell--editing': {
                bgcolor: 'rgb(255,215,115, 0.19)',
                color: '#1a3e72',
                '& .MuiInputBase-root': {
                  height: '100%',
                },
              },
              '& .Mui-error': {
                bgcolor: (theme) => `rgb(126,10,15, ${theme.palette.mode === 'dark' ? 0 : 0.1})`,
                color: (theme) => (theme.palette.mode === 'dark' ? '#ff4343' : '#750f0f'),
              },
            }}
            style={{ border: '0px' }}
            rows={rows}
            columns={buildColumns(safeFileManager, currentAction, onShareFileClick, onDownloadFileClick, onDeleteFileClick)}
            hideFooter={true}
            checkboxSelection
            disableSelectionOnClick
            showColumnRightBorder={false}
            onCellEditCommit={onCellEditCommit}
            onCellDoubleClick={onCellDoubleClick}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <ThemeSwitch theme={theme} setTheme={setTheme} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
