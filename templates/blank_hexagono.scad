$fn = 60;
altura = 3;

union() {
    cylinder(h=altura, r=20, $fn=6); // Hexágono
    
    // Argola saliente
    translate([0, 20, 0]) 
    difference() {
        cylinder(h=altura, r=5);
        translate([0, 0, -1]) cylinder(h=altura+2, r=2.5);
    }
}
