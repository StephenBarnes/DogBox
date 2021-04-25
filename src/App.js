import React, { useState, useEffect, useRef } from 'react';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CssBaseline from '@material-ui/core/CssBaseline';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listFiles } from './graphql/queries';
import { createFile as createFileMutation, deleteFile as deleteFileMutation } from './graphql/mutations';


function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    fetchFiles();
  }, []);
  
  async function fetchFiles() {
    const apiData = await API.graphql({ query: listFiles });
    setFiles(apiData.data.listFiles.items);
  }

  async function uploadFile() {
    const selectedFile = fileInputRef.current.files[0];
    if (!selectedFile) return;
    const name = fileInputRef.current.files[0].name;
    const bytes = fileInputRef.current.files[0].size;
    if (files.map(file => file.name).indexOf(name) !== -1) {
      alert("File with that name already exists.");
      fileInputRef.current.value = null;
      return;
    }

	setUploading(true);
    const fileDbObj = {name: name, bytes: bytes};
    await API.graphql({ query: createFileMutation, variables: { input: fileDbObj } });
    await Storage.put(name, selectedFile);
    setFiles([...files, {...fileDbObj, createdAt: "just now"}]);
	setUploading(false);
    fileInputRef.current.value = null;
  }

  async function deleteFile({ id, name }) {
    const newFilesArray = files.filter(file => file.id !== id);
    setFiles(newFilesArray);
    await API.graphql({ query: deleteFileMutation, variables: { input: { id: id } }});
    // TODO delete from storage
  }

  async function downloadFile({ name }) {
    const signedUrl = await Storage.get(name);
    window.open(signedUrl, '_blank').focus();
  }
  

  return (
    <React.Fragment>
      <CssBaseline />
      <main>
        <div className="header">
          <Container>
            <Typography component="h1" variant="h2" align="center" color="textPrimary" gutterBottom>
              <img src="doge.png" width="100px" alt="doge" />
              DogBox
            </Typography>
            <div>
              <Grid container justify="center">
                <Grid item>
                  <Button variant="contained" component="label" color="primary" className="upload-button" disabled={uploading}>
                    Upload<input type="file" hidden ref={fileInputRef} onChange={uploadFile} />
                  </Button>
                </Grid>
              </Grid>
            </div>
          </Container>
        </div>
        <Container className="card-grid" maxWidth="md">
          <Grid container spacing={4}>
            {files.map((file) => (
              <Grid item key={file.name} xs={12} sm={6} md={4} lg={3}>
                <Card className="card">
                  <CardContent className="card-content">
                    <Typography gutterBottom variant="h5" component="h2">
                      {file.name}
                    </Typography>
                    <Typography>
                      {bytesToString(file.bytes)}
                    </Typography>
                    <Typography variant="body2">
                      {file.createdAt.split('T')[0]}
                    </Typography>
                    <Typography variant="body2">
                      {file.createdAt.split('T')[1]}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="primary" onClick={() => downloadFile(file)}>
                      View
                    </Button>
                    <Button size="small" color="primary" onClick={() => deleteFile(file)}>
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </main>
      <div id="amplify-sign-out">
        <AmplifySignOut />
      </div>
    </React.Fragment>
  );
}

function bytesToString(bytes) {
    let result = bytes + " bytes";
    const units = ["KB", "MB", "GB", "TB", "PB"];
    let factor = 1024;
    for (let i = 0; ; i++) {
      if (factor > bytes) {
        return result;
      }
      result = (bytes / factor).toFixed(2) + " " + units[i];
      factor *= 1024;
    }
}

export default withAuthenticator(App);
