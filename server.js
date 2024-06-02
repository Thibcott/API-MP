const express = require('express');
const PDFDocument = require('./pdfkitTables.js');
const fs = require('fs');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');



dotenv.config();
const app = express();
const port = 3000;

app.use(bodyParser.json());

app.use(cors());


// Configuration de la base de données
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Connexion à la base de données
db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données MySQL :', err);
        throw err;
    }
    console.log('Connecté à la base de données MySQL');
});
//GET
app.get('/getPersonnes', (req, res) => {
    // console.log("hello i m local api")
    db.query('SELECT * FROM Personne', (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des données :', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
        }
        res.json(results);
    });
});

//GET
app.get('/getHistoric', (req, res) => {
    db.query('SELECT * FROM historic', (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des données :', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
        }
        res.json(results);
    });
});

//POST
app.post('/addPersonne', (req, res) => {
    const data = req.body;
    if (!data) {
        return res.status(400).json({ error: 'Le champ "data" est obligatoire' });
    }
    const sql = `INSERT INTO Personne (data) VALUES (?)`;
    db.query(sql, [JSON.stringify(data)], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'ajout de la requête :', err);
            return res.status(500).json({ error: 'Erreur lors de l\'ajout de la requête dans la base de données', status: false });
        }
        res.status(201).json({ message: 'Requête ajoutée avec succès', status: true, id: result.insertId });
    });
});

//PUT
app.put('/updatePersonne/:id', (req, res) => {
    const data = req.body;
    const id = req.params.id;

    if (!data) {
        return res.status(400).json({ error: 'Le champ "data" est obligatoire' });
    }

    const sql = `UPDATE Personne SET data = ? WHERE id = ?`;
    db.query(sql, [JSON.stringify(data), id], (err, result) => {
        if (err) {
            console.error('Erreur lors de la mise à jour de la requête :', err);
            return res.status(500).json({ error: 'Erreur lors de la mise à jour de la requête dans la base de données', status: false });
        }
        res.json({ message: 'Requête mise à jour avec succès', status: true });
    });
});

//DELETE
app.delete('/deletePersonne/:id', (req, res) => {
    const id = req.params.id;

    const sql = `DELETE FROM Personne WHERE id = ?`;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Erreur lors de la suppression de la requête :', err);
            return res.status(500).json({ error: 'Erreur lors de la suppression de la requête dans la base de données', status: false });
        }
        res.json({ message: 'Requête supprimée avec succès', status: true });
    });
});

app.post('/generate-pdf', async (req, res) => {
    const requestData = req.body;

    //ajouter les donneés dans la table historique
    if (!requestData) {
        return res.status(400).json({ error: 'les données sont obligatoire' });
    }
    const sql = `INSERT INTO historic (id_personne, data) VALUES (?,?);`;
    db.query(sql, [requestData.idPersonne, JSON.stringify(requestData)], (err, result) => {

        if (err) {
            console.error('Erreur lors de l\'ajout de la requête :', err);
            return res.status(500).json({ error: 'Erreur lors de l\'ajout de la requête dans la base de données', status: false });
        }
    });
    // Créez un nouveau document PDF
    const doc = new PDFDocument({ size: 'A4' });

    //header- same
    doc.image("logo.jpg", 60, 60, { width: 120 });
    doc.font('Helvetica').fontSize(11);
    doc.text('António Peixoto', 200, 70, { align: 'left' });
    doc.text('Rue des Rochers 5', { align: 'left' });
    doc.text('1950 Sion', { align: 'left' });
    doc.text('Tél : 076/ 595 95 64', { align: 'left' });
    doc.text('E-mail : pxtservices@icloud.com', { align: 'left' });

    //destinataire - CHANGE
    doc.fontSize(12);
    doc.text(requestData.genre, 360, 160, { align: 'left' });
    doc.text(requestData.nom + " " + requestData.prenom, { align: 'left' });
    doc.text(requestData.contact + ' \n ', { align: 'left' });

    //lieu data - CHANGE
    doc.text(requestData.date, { align: 'left' });
    //num d assurance - CHANGE
    doc.text('N° Assurance sociale : ' + requestData.avs + ' \n ', 60, 250, { align: 'left' });


    doc.font("Helvetica-Bold").fontSize(14);
    doc.text('Décompte de Salaire ' + requestData.mois + ' ' + requestData.annee, { align: 'left' });
    doc.moveTo(60, doc.y).lineTo(530, doc.y).stroke();
    let table1 = []
    if (requestData.divers == 0) {
        if (requestData.freePrompt == "") {
            table1 = {
                headers: ['Salaire brut', '           Coeff./taux', '         Base, Salaire', '                 Montant'],
                rows: [
                    ['Salaire horaire', requestData.workHour, requestData.base, requestData.salaireHoraire],
                    ['Supp. vac. + Jours fériés', requestData.pourcentVac, ' ', requestData.suppVac],
                    ['', '', '', ''],
                    ['Sous total brut', '', '', requestData.totBrut],
                    ['', '', '', ''],
                ]
            }
        } else {
            table1 = {
                headers: ['Salaire brut', '           Coeff./taux', '         Base, Salaire', '                 Montant'],
                rows: [
                    ['Salaire horaire', requestData.workHour, requestData.base, requestData.salaireHoraire],
                    ['Sup. vac. + Jours fériés', requestData.pourcentVac, ' ', requestData.suppVac],
                    [requestData.freePrompt, '', '', requestData.freeMontant],
                    ['', '', '', ''],
                    ['Sous total brut', '', '', requestData.totBrut],
                    ['', '', '', ''],
                ]
            }
        }

    } else {
        if (requestData.freePrompt == "") {
            table1 = {
                headers: ['Salaire brut', '            Coeff./taux', '         Base, Salaire', '                 Montant'],
                rows: [
                    ['Salaire horaire', requestData.workHour, requestData.base, requestData.salaireHoraire],
                    ['Supp. vac. + Jours fériés', requestData.pourcentVac, ' ', requestData.suppVac],
                    ['Divers', '', '', requestData.divers],
                    ['', '', '', ''],
                    ['Sous total brut', '', '', requestData.totBrut],
                    ['', '', '', ''],
                ]
            }
        } else {
            table1 = {
                headers: ['Salaire brut', '            Coeff./taux', '         Base, Salaire', '                Montant'],
                rows: [
                    ['Salaire horaire', requestData.workHour, requestData.base, requestData.salaireHoraire],
                    ['Supp. vac. + Jours fériés', requestData.pourcentVac, ' ', requestData.suppVac],
                    ['Divers', '', '', requestData.divers],
                    [requestData.freePrompt, '', '', requestData.freeMontant],
                    ['', '', '', ''],
                    ['Sous total brut', '', '', requestData.totBrut],
                    ['', '', '', ''],
                ]
            }
        }
    }


    doc.moveDown().table(table1, 65, doc.y, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
        prepareRow: (row, i) => doc.font('Helvetica').fontSize(12),
        width: 480
    });

    const table2 = {
        headers: ['Charges sociales', '', '', ''],
        rows: [
            ['Cotis. AVS/AI/APG', requestData.avsaiapg, requestData.totBrut, '-' + requestData.avsaiapgM],
            ['Cotisation AC', requestData.ac, requestData.totBrut, '-' + requestData.acM],
            ['AANP', requestData.aanp, requestData.totBrut, '-' + requestData.aanpM],
            ['Participation AFAM', requestData.afam, requestData.totBrut, '-' + requestData.afamM],
            ['LPP', requestData.lpp, requestData.totBrut, '-' + requestData.lppM],
            ['Impots Source', requestData.impotSource, requestData.totBrut, '-' + requestData.impotSourceM],
            ['', '', '', '']
        ]
    };

    doc.moveDown().table(table2, 65, doc.y, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(12),
        prepareRow: (row, i) => doc.font('Helvetica').fontSize(12),
        width: 480
    });

    //end
    doc.font("Helvetica-Oblique").fontSize(12);
    doc.text('Total des déductions sociales', { align: 'left' });
    doc.moveUp(1);
    doc.font("Helvetica-BoldOblique");
    doc.text('-' + requestData.totDeductions, { align: 'right' }); // - CHANGE

    doc.moveDown(2);

    doc.font("Helvetica-Bold").fontSize(12);
    doc.text('Salaire net', { align: 'left' });
    doc.moveUp(1);
    doc.font("Helvetica-Bold");
    doc.text(requestData.SalaireNet, { align: 'right' });// - CHANGE
    doc.moveDown(1);
    doc.moveTo(65, doc.y).lineTo(530, doc.y).stroke();

    // Envoi du fichier PDF comme réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="nom_du_fichier.pdf"'); // Nom du fichier à télécharger

    // Pipe le document PDF vers la réponse HTTP
    doc.pipe(res);
    doc.end();
});

app.listen(port, () => {
    console.log(`Serveur Express écoutant sur le port ${port}`);
});
