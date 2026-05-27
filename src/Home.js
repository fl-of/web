import { Button, Card } from "react-bootstrap";
import './App.css';

import { Button as MuiButton, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useState, useCallback, useEffect } from 'react';
import { BiLogIn } from "react-icons/bi";
import { IoInfiniteSharp } from 'react-icons/io5';
import { MdLockOutline, MdMoneyOff, MdOutlineSpeed } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';

function isMobile() {
  let check = false;
  //eslint-disable-next-line
  (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

function FileUploadRow({ name, progress }) {
  const done = progress === 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#ccc", marginBottom: 3 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{name}</span>
        <span style={{ color: done ? "#4ade80" : "#aaa" }}>{done ? "✓ Done" : `${progress}%`}</span>
      </div>
      <div style={{ width: "100%", background: "#2f3136", borderRadius: 8, padding: 3 }}>
        <div style={{
          width: `${progress}%`,
          height: 8,
          background: done ? "#4ade80" : "#5865f2",
          borderRadius: 6,
          transition: "width 0.2s ease"
        }} />
      </div>
    </div>
  );
}

function Home() {
  const [showMobileDialog, setShowMobileDialog] = useState(isMobile());
  const [uploads, setUploads] = useState([]);
  const navigate = useNavigate();

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;
    const fileManager = window.fileManager;
    if (!fileManager) {
      navigate("/setup");
      return;
    }
    setUploads(files.map(f => ({ name: f.name, progress: 0 })));
    await Promise.all(
      files.map((file, i) =>
        fileManager.uploadFile(
          "/" + file.name,
          file,
          (uploaded, total) => {
            setUploads(prev => {
              const next = [...prev];
              next[i] = { ...next[i], progress: total > 0 ? Math.round((uploaded / total) * 100) : 100 };
              return next;
            });
          }
        )
      )
    );
  }, [navigate]);

  useEffect(() => {
    // On manipule le DOM directement pour l'overlay — zero setState pendant le drag
    const overlay = document.getElementById('drag-overlay');
    let active = false;
    let dragTimeout;

    const showOverlay = () => {
      if (!active) {
        active = true;
        overlay.style.display = 'flex';
      }
    };

    const hideOverlay = () => {
      active = false;
      overlay.style.display = 'none';
    };

    const onDragOver = (e) => {
      e.preventDefault();
      showOverlay();
      clearTimeout(dragTimeout);
      dragTimeout = setTimeout(hideOverlay, 150);
    };

    const onDrop = async (e) => {
      e.preventDefault();
      clearTimeout(dragTimeout);
      hideOverlay();
      const files = Array.from(e.dataTransfer.files);
      await handleFiles(files);
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      clearTimeout(dragTimeout);
    };
  }, [handleFiles]);

  const handleUploadClick = useCallback(async () => {
    if (!window.showOpenFilePicker) {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.onchange = async () => { await handleFiles(Array.from(input.files)); };
      input.click();
      return;
    }
    try {
      const fileHandles = await window.showOpenFilePicker({ multiple: true });
      const files = await Promise.all(fileHandles.map(h => h.getFile()));
      await handleFiles(files);
    } catch { }
  }, [handleFiles]);

  const allDone = uploads.length > 0 && uploads.every(u => u.progress === 100);

  return (
    <div style={{ height: "100%" }}>
      <NavigationBar />

      {/* Overlay toujours dans le DOM, caché par défaut, affiché via JS direct */}
      <div id="drag-overlay" style={{
        display: 'none',
        position: "fixed",
        top: 0, left: 0,
        width: "100%", height: "100%",
        background: "rgba(0,0,0,0.55)",
        border: "4px dashed #4ade80",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2rem",
        color: "white",
        zIndex: 9999,
        pointerEvents: "none",
        boxSizing: "border-box"
      }}>
        <span style={{ fontSize: "4rem" }}>📂</span>
        <span>Drop your files to upload</span>
      </div>

      <Dialog open={showMobileDialog}>
        <DialogTitle>Warning</DialogTitle>
        <DialogContent>
          Disbox is not currently not supported on mobile devices. Please use a desktop device instead.
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setShowMobileDialog(false)}>Continue anyway</MuiButton>
        </DialogActions>
      </Dialog>

      <div className="App App-header">
        <div style={{ width: "100%", backgroundColor: "#2F3136" }}>
          <h1 style={{ fontSize: "6rem" }} className="mt-3"><b>Disbox</b></h1>
          <h1 style={{ fontSize: "2.5rem" }}>Free, fast, unlimited cloud storage.</h1>
          <div className="m-5">
            <Button style={{ fontSize: "2.5rem" }} variant="primary" onClick={() => navigate("/setup")}>
              <b>Start using</b>
            </Button>
            <Button className="m-2" style={{ fontSize: "2.5rem" }} variant="secondary" onClick={() => window.open("https://github.com/DisboxApp/web")}>
              <b>Find out more</b>
            </Button>
            <Button className="m-2" style={{ fontSize: "2.5rem" }} variant="success" onClick={handleUploadClick}>
              Upload file
            </Button>
          </div>
        </div>

        {uploads.length > 0 && (
          <div style={{
            width: "100%", maxWidth: 600,
            padding: "16px 24px",
            background: "#1e2124",
            borderRadius: 12,
            marginTop: 16
          }}>
            <div style={{ color: allDone ? "#4ade80" : "#fff", fontWeight: "bold", marginBottom: 12 }}>
              {allDone ? "✅ All uploads complete!" : `Uploading ${uploads.length} file${uploads.length > 1 ? "s" : ""}…`}
            </div>
            {uploads.map((u, i) => (
              <FileUploadRow key={i} name={u.name} progress={u.progress} />
            ))}
          </div>
        )}

        <div style={{ textAlign: "left", backgroundColor: "#FFFFFF", width: "100%", display: "flex", justifyContent: "center" }}>
          <Card bg="dark" style={{ width: '18rem', height: '24rem' }} className="m-2 mt-5">
            <Card.Header><MdMoneyOff /> Free</Card.Header>
            <Card.Body>
              <Card.Text style={{ fontSize: "1.1rem" }}>
                As free as it gets. No ads, no subscriptions, and no fees. All of our features are free to use, forever.
              </Card.Text>
            </Card.Body>
          </Card>
          <Card bg="dark" style={{ width: '18rem', height: '24rem' }} className="m-2 mt-5">
            <Card.Header><MdOutlineSpeed /> Fast</Card.Header>
            <Card.Body>
              <Card.Text style={{ fontSize: "1.1rem" }}>
                Extremely high upload and download speeds and fast load times. Upload files of any size, and download them instantly.
              </Card.Text>
            </Card.Body>
          </Card>
          <Card bg="dark" style={{ width: '18rem', height: '24rem' }} className="m-2 mt-5">
            <Card.Header><IoInfiniteSharp style={{ marginBottom: "0.4rem" }} /> Unlimited</Card.Header>
            <Card.Body>
              <Card.Text style={{ fontSize: "1.1rem" }}>
                No limits. Upload as many files as you want with no storage limit. Movies, music, images, backups, everything.
              </Card.Text>
            </Card.Body>
          </Card>
          <Card bg="dark" style={{ width: '18rem', height: '24rem' }} className="m-2 mt-5">
            <Card.Header><BiLogIn style={{ marginRight: "0.4rem" }} />Simple</Card.Header>
            <Card.Body>
              <Card.Text style={{ fontSize: "1.1rem" }}>
                Just a discord account required. No email, no registration, no passwords, everything is tied to your Discord account.
              </Card.Text>
            </Card.Body>
          </Card>
          <Card bg="dark" style={{ width: '18rem', height: '24rem' }} className="m-2 mt-5">
            <Card.Header><MdLockOutline /> Secure</Card.Header>
            <Card.Body>
              <Card.Text style={{ fontSize: "1.1rem" }}>
                All your files are stored on Discord's servers, and we have no access to them -
                we only store file metadata. Everything is open source and available on GitHub.
              </Card.Text>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Home;
