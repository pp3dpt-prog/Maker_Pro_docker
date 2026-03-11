const express = require('express');
const { exec } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: 'https://maker-pro-frontend.vercel.app', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

app.post('/gerar-stl-pro', async (req, res) => {
    const { nome, telefone, forma } = req.body;
    
    if (!nome || !telefone || !forma) {
        return res.status(400).json({ error: "Faltam dados" });
    }

    const id = `pro_${Date.now()}`;
    const scadPath = path.join(tempDir, `${id}.scad`);
    const stlPath = path.join(tempDir, `${id}.stl`);

    const nomeLimpo = nome.replace(/[^a-z0-9 ]/gi, '').trim();
    const telLimpo = telefone.replace(/[^0-9+ ]/g, '').trim();
    const numCaracteres = nomeLimpo.length;

    const formaLimpa = forma.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("ç", "c");
    const fontSize = Math.max(2.5, Math.min(5, 20 / Math.max(1, numCaracteres)));

    const scadCode = `
    $fn = 50; 
    include <templates/blank_${formaLimpa}.scad>;

    difference() {
        union() {
            blank_${formaLimpa}(); 
            
            // Nome na Frente (Z=3)
            translate([0, 3, 3]) 
            linear_extrude(height=1.2) 
            text("${nomeLimpo}", size=${fontSize}, halign="center", valign="center", font="Liberation Sans:style=Bold");
        }
        
        // Número no Verso (Escavado) - Mirror para leitura correta
        translate([0, 3, -0.5]) 
        mirror([1, 0, 0])
        linear_extrude(height=1.5) 
        text("${telLimpo}", size=3.5, halign="center", valign="center", font="Liberation Sans:style=Bold");
    }
    `;

    try {
        fs.writeFileSync(scadPath, scadCode);

        // AQUI ESTÁ A FLAG QUE FALTAVA E A CORREÇÃO DO COMANDO
        const comando = `openscad --enable=manifold -o "${stlPath}" "${scadPath}"`;
        
        exec(comando, async (error, stdout, stderr) => {
            if (error) {
                console.error("Erro OpenSCAD:", stderr);
                return res.status(500).json({ error: "Erro na renderização" });
            }

            try {
                const fileBuffer = fs.readFileSync(stlPath);
                await supabase.storage.from('makers_pro_stls').upload(`previews/${id}.stl`, fileBuffer);
                const { data } = supabase.storage.from('makers_pro_stls').getPublicUrl(`previews/${id}.stl`);
                res.json({ url: data.publicUrl });
            } catch (upErr) {
                res.status(500).json({ error: "Erro no upload" });
            } finally {
                if (fs.existsSync(scadPath)) fs.unlinkSync(scadPath);
                if (fs.existsSync(stlPath)) fs.unlinkSync(stlPath);
            }
        });
    } catch (err) {
        res.status(500).send("Erro interno");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));