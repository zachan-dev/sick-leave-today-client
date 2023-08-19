import logo from './logo.svg';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import { collection, addDoc, getDocs } from "@firebase/firestore";
import firestore from './firebase.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { Modal, Button } from 'react-bootstrap';
import CreatableSelect from 'react-select/creatable';

const auth = getAuth();

function isEmpty(value){
  return (value == null || value.length === 0);
}

function replacePTagsWithDoubleBreaks(input) {
  let div = document.createElement('div');
  div.innerHTML = input;

  let paragraphs = Array.from(div.querySelectorAll('p'));

  let finalOutput = "";

  paragraphs.forEach((p, index) => {
    if(p.innerHTML === "<br>") {
      finalOutput += "<br>";
    } else {
      if(index !== 0) {
        finalOutput += "<br>";
      }
      finalOutput += p.textContent;
    }
  });

  return finalOutput;
}


function App() {
  const [bodyValue, setBodyValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [user, setUser] = useState(null);
  const [selectedName, setSelectedName] = useState(null);
  const [nameOptions, setNameOptions] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailOptions, setEmailOptions] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [selectedBodyTemplate, setSelectedBodyTemplate] = useState(null);
  const [bodyTemplateOptions, setBodyTemplateOptions] = useState([]);
  // const [requests, setRequests] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, set the user state
        console.log("User is signed in");
        setUser(user);
        const toSuggestionsCollection = collection(firestore, "to_suggestions");
        const toSuggestionsSnapshot = await getDocs(toSuggestionsCollection);
        const toNameSuggestions = toSuggestionsSnapshot.docs.map(doc => ({ value: doc.data().name, label: doc.data().name }));
        setNameOptions(toNameSuggestions);
        const toEmailSuggestions = toSuggestionsSnapshot.docs.map(doc => ({ value: doc.data().email, label: doc.data().email }));
        setEmailOptions(toEmailSuggestions);
        const subjectSuggestionsCollection = collection(firestore, "subject_suggestions");
        const subjectSuggestionsSnapshot = await getDocs(subjectSuggestionsCollection);
        const subjectSuggestions = subjectSuggestionsSnapshot.docs.map(doc => ({ value: doc.data().subject, label: doc.data().subject }));
        setSubjectOptions(subjectSuggestions);
        const bodySuggestionsCollection = collection(firestore, "body_suggestions");
        const bodySuggestionsSnapshot = await getDocs(bodySuggestionsCollection);
        const bodySuggestions = bodySuggestionsSnapshot.docs.map(doc => ({ value: doc.data().body, label: doc.data().body }));
        setBodyTemplateOptions(bodySuggestions);
      } else {
        // User is signed out
        console.log("User is not signed");
        setUser(null);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);  // Pass `auth` as dependency to re-run when `auth` changes

  // useEffect(() => {
  //   return firestore.collection('requests')
  //     .orderBy('request_time', 'desc')
  //     .onSnapshot(snapshot => {
  //       const newRequests = snapshot.docs.map(doc => {
  //         return { id: doc.id, ...doc.data() }
  //       });

  //       setRequests(newRequests);
  //     });
  // }, [firestore]);


  const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],

    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
    [{ 'direction': 'rtl' }],                         // text direction

    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'font': [] }],
    [{ 'align': [] }],

    ['clean']                                         // remove formatting button
  ];
  const module = {
    toolbar: toolbarOptions
  }

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      if (isEmpty(selectedName) || isEmpty(selectedName.value)) {
        throw new Error("Please enter a name");
      }
      if (isEmpty(selectedEmail) || isEmpty(selectedEmail.value)) {
        throw new Error("Please enter an email address");
      }
      if (isEmpty(selectedSubject) || isEmpty(selectedSubject.value)) {
        throw new Error("Please enter a subject line");
      }

      const docRef = await addDoc(collection(firestore, "requests"), {
        to_name: selectedName.value,
        to_email: selectedEmail.value,
        subject: selectedSubject.value,
        body: replacePTagsWithDoubleBreaks(bodyValue),
        request_status: "requested",
        request_time: new Date(),
        sent_time: null,
        msg_url: null,
      });

      console.log("Document written with ID: ", docRef.id);
      setModalMessage("Your form has been successfully submitted!"); // success message
      setShowModal(true);
    } catch (e) {
      console.error("Error adding document: ", e);
      setModalMessage(`Error: ${e.message}`); // error message
      setShowModal(true);
    }
  };

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.log(error);
    }
  };

  const handleNameChange = (option) => {
    setSelectedName(option);
  };
  const handleEmailChange = (option) => {
    setSelectedEmail(option);
  };
  const handleSubjectChange = (option) => {
    setSelectedSubject(option);
  };
  const handleBodyTemplateChange = (option) => {
    setSelectedBodyTemplate(option);
    if (!isEmpty(option) && !isEmpty(option.value)) {
      setBodyValue(option.value);
    }
  };
  

  return (
    <div className="App">
      <div className="container">
        <div className="py-5 text-center">
          <h2>Sick Leave Today! Sender</h2>
          <p className="lead">Once you submit it, you take a day off!</p>
          {user ? (
            <p>Logged in as {user.displayName}</p>  // Show user info when logged in
          ) : (
            <button className="w-100 btn btn-primary btn-lg" onClick={handleSignIn}>Sign In with Google</button> // Show Sign In button when logged out
          )}
        </div>

        <div className="row">
          <div className="col">
            <h4 className="mb-3">Email</h4>
            <form className="needs-validation" noValidate="" onSubmit={handleFormSubmit}>
              <div className="row g-3">
                

                <div className="col-12">
                  <label htmlFor="from" className="form-label">From</label>
                  <div className="input-group">
                    <input disabled type="text" className="form-control" id="from" value="Zach Chan <zchan@ab.bluecross.ca>" />
                  </div>
                </div>

                <div className="col-12">
                  <label htmlFor="to_name" className="form-label">To Name</label>
                  {/* <input type="text" className="form-control" id="to_name" placeholder="" required/> */}
                  <CreatableSelect
                    id="to_name"
                    className="form-control"
                    isClearable
                    onChange={handleNameChange}
                    options={nameOptions}
                    value={selectedName}
                    required
                  />
                  <div className="invalid-feedback">
                    Please enter the name of the recipient.
                  </div>
                </div>

                <div className="col-12">
                  <label htmlFor="to_email" className="form-label">To Email</label>
                  {/* <input type="email" className="form-control" id="to_email" placeholder="you@example.com" required/> */}
                  <CreatableSelect
                    id="to_email"
                    className="form-control"
                    isClearable
                    onChange={handleEmailChange}
                    options={emailOptions}
                    value={selectedEmail}
                    required
                  />
                  <div className="invalid-feedback">
                    Please enter a valid email address for the recipient.
                  </div>
                </div>

                <div className="col-12">
                  <label htmlFor="subject" className="form-label">Subject</label>
                  {/* <input type="text" className="form-control" id="subject" placeholder="" required/> */}
                  <CreatableSelect
                    id="subject"
                    className="form-control"
                    isClearable
                    onChange={handleSubjectChange}
                    options={subjectOptions}
                    value={selectedSubject}
                    required
                  />
                  <div className="invalid-feedback">
                    Please enter the subject of the email.
                  </div>
                </div>

                <div className="col-12">
                  <label htmlFor="body_template" className="form-label">Body Template</label>
                  <CreatableSelect
                    id="body_template"
                    className="form-control"
                    isClearable
                    onChange={handleBodyTemplateChange}
                    options={bodyTemplateOptions}
                    value={selectedBodyTemplate}
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="body" className="form-label">Body</label>
                  <ReactQuill
                    value={bodyValue}
                    onChange={(value) => setBodyValue(value)}
                    modules={module}
                    theme="snow"
                  />
                  <input type="text" className="form-control" id="body" hidden required 
                    value={bodyValue} readOnly/>
                </div>

                {/* <div className="col-12">
                  <label htmlFor="address2" className="form-label">Address 2 <span className="text-body-secondary">(Optional)</span></label>
                  <input type="text" className="form-control" id="address2" placeholder="Apartment or suite" />
                </div>

                <div className="col-md-5">
                  <label htmlFor="country" className="form-label">Country</label>
                  <select className="form-select" id="country" required="">
                    <option value="">Choose...</option>
                    <option>United States</option>
                  </select>
                  <div className="invalid-feedback">
                    Please select a valid country.
                  </div>
                </div>

                <div className="col-md-4">
                  <label htmlFor="state" className="form-label">State</label>
                  <select className="form-select" id="state" required="">
                    <option value="">Choose...</option>
                    <option>California</option>
                  </select>
                  <div className="invalid-feedback">
                    Please provide a valid state.
                  </div>
                </div>

                <div className="col-md-3">
                  <label htmlFor="zip" className="form-label">Zip</label>
                  <input type="text" className="form-control" id="zip" placeholder="" required="" />
                  <div className="invalid-feedback">
                    Zip code required.
                  </div>
                </div> */}
              </div>

              <hr className="my-4" />

              <button className="w-100 btn btn-primary btn-lg" type="submit">Send!</button>
            </form>
          </div>
        </div>

        <footer className="my-5 pt-5 text-body-secondary text-center text-small">
          <p className="mb-1">© 2023 Zach Chan</p>
          <ul className="list-inline">
            <li className="list-inline-item"><a href="#">Privacy</a></li>
            <li className="list-inline-item"><a href="#">Terms</a></li>
            <li className="list-inline-item"><a href="#">Support</a></li>
          </ul>
        </footer>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Submitted</Modal.Title>
          </Modal.Header>
          <Modal.Body>{modalMessage}</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default App;
