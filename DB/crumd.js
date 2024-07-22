import express from 'express';
import { } from './firebase.js';
import { db } from './firestore.js';
import dotenv from 'dotenv';
// import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

dotenv.config();

//rest object
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

export const createData = async (collectionName, id, data) => {
  try {
    const create = await db.collection(collectionName).doc(id).set(data);
    return create;
  } catch (error) {
    console.log(error);
  }
};

export const createCollection = async (firstCollectionName, secondCollectionName, id, data, initialDoc = false) => {
  try {
    // Create the document with the specified ID and timestamp
    await db.collection(firstCollectionName).doc(id).set(data);

    // Create a reference to the nested collection
    const collectionRef = db.collection(firstCollectionName).doc(id).collection(secondCollectionName);

    // If initialDoc is provided, add it to the nested collection
    if (initialDoc) {
      await collectionRef.add(initialDoc);
    }

    return create;
  } catch (error) {
    console.log(error);
  }
};

export const createSubData = async (firstCollectionName, secondCollectionName, id1, id2, data) => {
  try {
    // Create a reference to the nested collection
    const collectionRef = db.collection(firstCollectionName).doc(id1);

    // If initialDoc is provided, add it to the nested collection
    if (data) {
      await collectionRef.collection(secondCollectionName).doc(id2).set(data);
    }

    return data;
  } catch (error) {
    console.log(error);
  }
};


export const readAllData = async (collectionName) => {
  try {
    //Retrieve user data
    const querySnapshot = await db
      .collection(collectionName)
      .get();
    let queryData = [];
    querySnapshot.forEach((doc) => {
      queryData.push(doc.data());
    });
    return queryData;
  } catch (error) {
    console.log(error);
  }
};

export const readAllLimitData = async (collectionName, fields) => {
  try {
    let query = db.collection(collectionName).limit(100); // Adjust the limit according to your needs
    
    // Apply the select if fields are provided
    if (fields && fields.length > 0) {
      query = query.select(...fields);
    }
    
    const querySnapshot = await query.get();

    let queryData = [];
    querySnapshot.forEach((doc) => {
      queryData.push(doc.data());
    });

    return queryData;
  } catch (error) {
    console.error("Error retrieving data:", error);
    throw error; // Re-throw the error after logging it
  }
};

export const readAllSubData = async (firstCollectionName, secondCollectionName, id) => {
  try {
    //Retrieve user data
    const querySnapshot = await db
      .collection(firstCollectionName)
      .doc(id).
      collection(secondCollectionName).
      get();
    let queryData = [];
    querySnapshot.forEach((doc) => {
      queryData.push(doc.data());
    });
    return queryData;
  } catch (error) {
    console.log(error);
  }
};

export const readAllLimitSubData = async (firstCollectionName, secondCollectionName, id, fields) => {
  try {
    //Retrieve user data
    var query = db
      .collection(firstCollectionName)
      .doc(id).
      collection(secondCollectionName).
      limit(100);
      // Apply the select if fields are provided
      if (fields && fields.length > 0) {
        query = query.select(...fields);
      }
      
      const querySnapshot = await query.get();
  
      let queryData = [];
      querySnapshot.forEach((doc) => {
        queryData.push(doc.data());
      });
  
      return queryData;
  } catch (error) {
    console.log(error);
  }
};

export const readSingleData = async (collectionName, id) => {
  try {
    console.log(id);
    const userRef = await db.collection(collectionName).doc(id).get();
    return userRef.data();
  } catch (error) {
    console.log(error);
  }
};

export const readSingleSubData = async (firstCollectionName, secondCollectionName, id1, id2) => {
  try {
    //Retrieve user data
    const userRef = await db.collection(firstCollectionName).doc(id1).collection(secondCollectionName).doc(id2).get();
    return userRef.data();
  } catch (error) {
    console.log(error);
  }
};

export const readFieldData = async (collectionName, id, fieldName) => {
  try {
    const docRef = await db.collection(collectionName).doc(id).get();

    if (docRef.exists) {
      const fieldValue = docRef.get(fieldName);
      return fieldValue;
    } else {
      console.log("Document does not exist");
      return null;
    }
  } catch (error) {
    console.error("Error reading field:", error);
    throw error;
  }
}

export const readSubFieldData = async (firstCollectionName, secondCollectionName, id, subId, fieldName) => {
  try {
    // Get the document reference
    const docRef = await db.collection(firstCollectionName).doc(id).collection(secondCollectionName).doc(subId).get();
    console.log(docRef.data());
    if (docRef.exists) {
      const fieldValue = docRef.get(fieldName);
      return fieldValue;
    } else {
      console.log("Document does not exist");
      return null;
    }
  } catch (error) {
    console.error('Error reading document:', error);
    return null;
  }
};

export const matchData = async (collectionName, key, value) => {
  const querySnapshot = await db
    .collection(collectionName)
    .where(key, '==', value)
    .get();
  return querySnapshot;
}

export const matchSubData = async (firstCollectionName, secondCollectionName, id, key, value) => {
  const querySnapshot = await db
    .collection(firstCollectionName)
    .doc(id)
    .collection(secondCollectionName)
    .where(key, '==', value)
    .get();
  return querySnapshot;
}

export const matchTwoData = async (collectionName, key1, value1, key2, value2) => {
  const querySnapshot = await db
    .collection(collectionName)
    .where(key1, '==', value1)
    .where(key2, '==', value2)
    .get();
  return querySnapshot;
}

export const matchNestedData = async (firstCollectionName, secondCollectionName, id, key, value) => {
  const querySnapshot = await db
    .collection(firstCollectionName).
    doc(id).
    collection(secondCollectionName)
    .where(key, '==', value)
    .get();
  return querySnapshot;
}

export const updateData = async (collectionName, id, data) => {
  try {
    const userRef = await db.collection(collectionName).doc(id).update(data);
    return userRef
  } catch (error) {
    console.log(error);
  }
};

export const updateSubData = async (firstCollectionName, secondCollectionName, id1, id2, data) => {
  try {
    const userRef = await db.collection(firstCollectionName).doc(id1).collection(secondCollectionName).doc(id2).update(data);
    return userRef
  } catch (error) {
    console.log(error);
  }
};

export const updateSubFieldData = async (collectionName, id, fieldName, subId, newObject) => {
  try {
    // Get the document reference
    const docRef = db.collection(collectionName).doc(id);

    const docSnap = await docRef.get();

    if (!docSnap) {
      console.log('No such document!');
      return null;
    }

    // Get the data from the document
    const data = docSnap.data();

    if (!data || !data[fieldName]) {
      console.log('No field data found!');
      return null;
    }

    // Find the index of the object with the specified imageId
    const itemIndex = data[fieldName].findIndex((item) => item.imageId === subId);

    if (itemIndex === -1) {
      console.log('No item found with the specified imageId!');
      return null;
    }

    // 5. Replace the object in the array with the new object
    var updateData = data[fieldName][itemIndex] = { ...newObject, subId }; // Ensures the imageId remains the same

    const update = docRef.update({
      [fieldName]: data[fieldName],
    });

    // Return the found item
    return updateData;
  } catch (error) {
    console.error('Error reading document:', error);
    return null;
  }
};

export const deleteData = async (collectionName, id) => {
  try {
    const response = await db
      .collection(collectionName)
      .doc(id)
      .delete();
    console.log(response);
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const deleteSubData = async (firstCollectionName, secondCollectionName, id1, id2) => {
  try {
    const response = await db
      .collection(firstCollectionName)
      .doc(id1)
      .collection(secondCollectionName)
      .doc(id2)
      .delete();
    console.log(response);
    return response;
  } catch (error) {
    console.log(error);
  }
};

export const deleteSubFieldData = async (collectionName, id, fieldName, subId) => {
  try {
    // Get the document reference
    const docRef = db.collection(collectionName).doc(id);

    const docSnap = await docRef.get();

    if (!docSnap) {
      console.log('No such document!');
      return null;
    }

    // Get the data from the document
    const data = docSnap.data();

    if (!data || !data[fieldName]) {
      console.log('No field data found!');
      return null;
    }

    // Find the index of the object with the specified imageId
    const itemIndex = data[fieldName].findIndex((item) => item.imageId === subId);

    if (itemIndex === -1) {
      console.log('No item found with the specified imageId!');
      return null;
    }

    // 5. Remove the object from the array
    var updateData = data[fieldName].splice(itemIndex, 1);

    const update = docRef.update({
      [fieldName]: data[fieldName],
    });

    // Return the found item
    return updateData;
  } catch (error) {
    console.error('Error reading document:', error);
    return null;
  }
};
