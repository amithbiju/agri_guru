import React, { useEffect, useState } from "react";
import "./UserForm.scss";
import { db } from "../../firebase/Config";
import { collection, addDoc } from "firebase/firestore";
import { auth } from "../../firebase/Config";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const UserForm = () => {
  const [userUID, setUserUID] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // ✅ Logged in
        console.log("User is logged in hehe:", user.uid);
        setUserUID(user.uid);
      } else {
        // ❌ Logged out
        console.log("User is not logged in");
        setUserUID(null);
      }
    });

    return () => unsubscribe(); // clean up listener on unmount
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    interests: [],
    userid: "",
  });
  useEffect(() => {
    if (userUID) {
      setFormData((prev) => ({ ...prev, userid: userUID }));
    }
  }, [userUID]);
  const [newInterest, setNewInterest] = useState("");

  const handleChange = (e, index = null) => {
    const { name, value } = e.target;

    if (name === "interests" && index !== null) {
      const newInterests = [...formData.interests];
      newInterests[index] = value;
      setFormData({ ...formData, interests: newInterests });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed !== "") {
      setFormData({ ...formData, interests: [...formData.interests, trimmed] });
      setNewInterest("");
    }
  };

  const removeInterest = (index) => {
    const newInterests = [...formData.interests];
    newInterests.splice(index, 1);
    setFormData({ ...formData, interests: newInterests });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "users"), formData);
      alert("User added successfully");
      navigate("/");
    } catch (error) {
      console.error("Error adding user: ", error);
    }
  };

  return (
    <div className="form-container">
      <form className="user-form" onSubmit={handleSubmit}>
        <h2>Add User</h2>
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="age"
          placeholder="Age"
          value={formData.age}
          onChange={handleChange}
          required
        />

        <div className="interest-input-group">
          <input
            type="text"
            placeholder="Add Interest"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
          />
          <button
            type="button"
            onClick={addInterest}
            className="add-btn-inline"
          >
            +
          </button>
        </div>

        <div className="interest-tags">
          {formData.interests.map((interest, index) => (
            <div className="interest-tag" key={index}>
              <input
                type="text"
                name="interests"
                value={interest}
                onChange={(e) => handleChange(e, index)}
              />
              <span onClick={() => removeInterest(index)}>&times;</span>
            </div>
          ))}
        </div>

        {/* <input
          type="text"
          name="userid"
          placeholder="User ID"
          value={formData.userid}
          onChange={handleChange}
          required
        /> */}
        <button type="submit">Submit</button>
      </form>
      <div className="image-section">
        <img src="/user-illustration-dark.png" alt="Form Illustration" />
      </div>
    </div>
  );
};

export default UserForm;
