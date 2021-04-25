import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listFiles } from './graphql/queries';
import { createFile as createFileMutation, deleteFile as deleteFileMutation } from './graphql/mutations';

function App() {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef();

  useEffect(() => {
    fetchFiles();
  }, []);
  
  async function fetchFiles() {
    const apiData = await API.graphql({ query: listFiles });
    setFiles(apiData.data.listFiles.items);
    console.log("Fetched files, new array: ", apiData.data.listFiles.items);
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

    const fileDbObj = {name: name, bytes: bytes};
    await API.graphql({ query: createFileMutation, variables: { input: fileDbObj } });
    await Storage.put(name, selectedFile);
    setFiles([...files, {...fileDbObj, createdAt: "just now"}]);
    console.log("Files now:", [...files, {...fileDbObj, createdAt: "just now"}]);
    fileInputRef.current.value = null;
  }

  async function deleteFile({ id, name }) {
    const newFilesArray = files.filter(file => file.id !== id);
    setFiles(newFilesArray);
    await API.graphql({ query: deleteFileMutation, variables: { input: { id: id } }});
    // TODO delete from storage
  }

  async function downloadFile({ name }) {
    console.log("Downloading:", name);
    const signedUrl = await Storage.get(name);
    window.open(signedUrl, '_blank').focus();
  }

  return (
    <div className="App">
      <h1>DogBox</h1>
      <input
        type="file"
        ref={fileInputRef}
        onChange={uploadFile}
      />
      <div style={{marginBottom: 30}}>
        {
          files.map(file => (
            <div key={file.name}>
              <h3>{file.name}</h3>
              <p>{bytesToString(file.bytes)}</p>
              <p>Uploaded {file.createdAt}</p>
              <button onClick={() => downloadFile(file)}>Download</button>
              <button onClick={() => deleteFile(file)}>Delete</button>
            </div>
          ))
        }
      </div>
      <AmplifySignOut />
    </div>
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
