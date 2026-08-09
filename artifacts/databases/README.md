# Databases Artifacts

This folder contains the core persistence and database-driven files for the **Travlr Getaways** application, highlighting the integration of MongoDB via Mongoose ODM to replace static mock storage.

* **db.js**: Manages persistent connection handling and Mongoose event logging for stable database sessions.
* **travlr.js**: Defines strict Mongoose schemas, data types, required validation rules, and unique indices (such as unique trip codes).
* **trips.js**: Implements RESTful CRUD query operations mapping HTTP requests directly to Mongoose primitives (`find()`, `create()`, `findOneAndUpdate()`, `findOneAndDelete()`).
