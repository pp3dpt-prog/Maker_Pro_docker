$fn = 60;
altura = 3;

module coracao_base_cubo() {
    union() {
        // As duas metades superiores (arredondadas para formar o topo do coração)
        translate([-5, 5, 0]) cylinder(h = altura, r = 7);
        translate([5, 5, 0]) cylinder(h = altura, r = 7);
        
        // O Bico: um cubo rodado a 45 graus para criar uma ponta geométrica
        translate([0, -9.60, 0]) 
        rotate([0, 0, 45]) 
        cube([12, 12, altura], center = false);
    }
}

// Junta a forma com a argola física
union() {
    coracao_base_cubo();
    
    // Argola integrada no topo (também com aspeto robusto)
    translate([0, 14, 0]) 
    difference() {
        cylinder(h = 2.5, r = 5.5, center 0 true);
        translate([0, 0, -1]) cylinder(h = altura + 2, r = 2.5));
    }
}