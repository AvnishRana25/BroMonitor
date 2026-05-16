import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ChapterSeed = {
  name: string;
  topics: string[];
};

// NCERT Class 11 — comprehensive chapter + topic syllabus
const physics: ChapterSeed[] = [
  {
    name: "Units and Measurements",
    topics: [
      "The international system of units",
      "Measurement of length, mass and time",
      "Significant figures",
      "Errors in measurement",
      "Dimensions of physical quantities",
      "Dimensional formulae and equations",
      "Dimensional analysis and applications",
    ],
  },
  {
    name: "Motion in a Straight Line",
    topics: [
      "Position, path length and displacement",
      "Average velocity and average speed",
      "Instantaneous velocity and speed",
      "Acceleration",
      "Kinematic equations for uniformly accelerated motion",
      "Position-time graphs",
      "Velocity-time graphs",
      "Relative velocity in one dimension",
    ],
  },
  {
    name: "Motion in a Plane",
    topics: [
      "Scalars and vectors",
      "Multiplication of vectors by real numbers",
      "Addition and subtraction of vectors (graphical)",
      "Resolution of vectors",
      "Vector addition (analytical method)",
      "Motion in a plane with constant velocity",
      "Motion in a plane with constant acceleration",
      "Projectile motion",
      "Uniform circular motion",
      "Relative velocity in two dimensions",
    ],
  },
  {
    name: "Laws of Motion",
    topics: [
      "Aristotle's fallacy and the law of inertia",
      "Newton's first law of motion",
      "Linear momentum",
      "Newton's second law of motion",
      "Newton's third law of motion",
      "Conservation of linear momentum",
      "Equilibrium of a particle",
      "Friction (static, kinetic, rolling)",
      "Circular motion and centripetal force",
      "Motion on a level and banked road",
    ],
  },
  {
    name: "Work, Energy and Power",
    topics: [
      "Work done by a constant force",
      "Work done by a variable force",
      "Kinetic energy and the work-energy theorem",
      "Potential energy",
      "Conservation of mechanical energy",
      "Potential energy of a spring",
      "Conservative and non-conservative forces",
      "Power",
      "Collisions in one dimension",
      "Collisions in two dimensions",
    ],
  },
  {
    name: "System of Particles and Rotational Motion",
    topics: [
      "Centre of mass",
      "Motion of centre of mass",
      "Linear momentum of a system of particles",
      "Vector product of two vectors",
      "Angular velocity and angular acceleration",
      "Torque",
      "Angular momentum",
      "Equilibrium of a rigid body",
      "Moment of inertia",
      "Theorems of perpendicular and parallel axes",
      "Kinematics and dynamics of rotation about a fixed axis",
      "Rolling motion",
    ],
  },
  {
    name: "Gravitation",
    topics: [
      "Kepler's laws of planetary motion",
      "Universal law of gravitation",
      "Gravitational constant",
      "Acceleration due to gravity at and near the surface",
      "Variation of g with altitude and depth",
      "Gravitational potential energy",
      "Escape speed",
      "Earth satellites and orbital velocity",
      "Energy of an orbiting satellite",
    ],
  },
  {
    name: "Mechanical Properties of Solids",
    topics: [
      "Stress and strain",
      "Hooke's law",
      "Stress-strain curve",
      "Young's modulus",
      "Bulk modulus and modulus of rigidity",
      "Applications of elastic behaviour",
    ],
  },
  {
    name: "Mechanical Properties of Fluids",
    topics: [
      "Pressure",
      "Pascal's law and its applications",
      "Variation of pressure with depth",
      "Atmospheric and gauge pressure",
      "Hydraulic machines",
      "Streamline flow and equation of continuity",
      "Bernoulli's principle",
      "Viscosity and Stokes' law",
      "Reynolds number",
      "Surface tension and capillarity",
    ],
  },
  {
    name: "Thermal Properties of Matter",
    topics: [
      "Temperature and heat",
      "Measurement of temperature",
      "Ideal-gas equation and absolute temperature",
      "Thermal expansion (linear, area, volume)",
      "Specific heat capacity",
      "Calorimetry",
      "Change of state and latent heat",
      "Heat transfer (conduction, convection, radiation)",
      "Newton's law of cooling",
    ],
  },
  {
    name: "Thermodynamics",
    topics: [
      "Thermal equilibrium",
      "Zeroth law of thermodynamics",
      "Heat, internal energy and work",
      "First law of thermodynamics",
      "Specific heat capacity (Cp, Cv) for gases",
      "Thermodynamic state variables and equation of state",
      "Thermodynamic processes (isothermal, adiabatic, isobaric, isochoric)",
      "Heat engines, refrigerators and heat pumps",
      "Second law of thermodynamics",
      "Carnot engine",
    ],
  },
  {
    name: "Kinetic Theory",
    topics: [
      "Molecular nature of matter",
      "Behaviour of gases (Boyle's, Charles', Avogadro's)",
      "Kinetic theory of an ideal gas",
      "Kinetic interpretation of temperature",
      "Law of equipartition of energy",
      "Specific heat capacities of gases and solids",
      "Mean free path",
    ],
  },
  {
    name: "Oscillations",
    topics: [
      "Periodic and oscillatory motions",
      "Simple harmonic motion (SHM)",
      "SHM and uniform circular motion",
      "Velocity and acceleration in SHM",
      "Force law for SHM",
      "Energy in SHM",
      "Spring-mass system",
      "Simple pendulum",
      "Damped and forced oscillations",
    ],
  },
  {
    name: "Waves",
    topics: [
      "Transverse and longitudinal waves",
      "Displacement relation for a progressive wave",
      "Speed of a travelling wave",
      "Speed of sound in different media",
      "Principle of superposition of waves",
      "Reflection of waves",
      "Standing waves in strings",
      "Standing waves in air columns",
      "Beats",
      "Doppler effect",
    ],
  },
];

const chemistry: ChapterSeed[] = [
  {
    name: "Some Basic Concepts of Chemistry",
    topics: [
      "Importance and scope of chemistry",
      "Nature of matter (states and classification)",
      "Properties of matter and SI units",
      "Uncertainty in measurement and significant figures",
      "Laws of chemical combination",
      "Dalton's atomic theory",
      "Atomic and molecular masses",
      "Mole concept and molar mass",
      "Percentage composition",
      "Stoichiometry and stoichiometric calculations",
      "Concentration of solutions",
    ],
  },
  {
    name: "Structure of Atom",
    topics: [
      "Discovery of electron, proton and neutron",
      "Atomic models (Thomson, Rutherford)",
      "Developments leading to Bohr's model",
      "Bohr's model of hydrogen atom",
      "Limitations of Bohr's model",
      "Dual nature of matter and uncertainty principle",
      "Quantum mechanical model of the atom",
      "Quantum numbers",
      "Shapes of atomic orbitals (s, p, d)",
      "Energies of orbitals",
      "Filling of orbitals (Aufbau, Pauli, Hund)",
      "Electronic configurations of atoms",
      "Stability of half-filled and fully-filled orbitals",
    ],
  },
  {
    name: "Classification of Elements and Periodicity in Properties",
    topics: [
      "Genesis of periodic classification",
      "Modern periodic law and the periodic table",
      "Nomenclature of elements with Z > 100",
      "Electronic configurations and the periodic table",
      "Types of elements (s, p, d, f blocks)",
      "Periodic trends in atomic and ionic radii",
      "Periodic trends in ionization enthalpy",
      "Periodic trends in electron gain enthalpy",
      "Electronegativity and its variation",
      "Periodic trends in chemical properties",
    ],
  },
  {
    name: "Chemical Bonding and Molecular Structure",
    topics: [
      "Kossel-Lewis approach to chemical bonding",
      "Ionic or electrovalent bond",
      "Lattice enthalpy and ionic compounds",
      "Covalent bond and Lewis structures",
      "Bond parameters (length, angle, enthalpy, order)",
      "Resonance",
      "Polarity of bonds and dipole moment",
      "VSEPR theory and shapes of molecules",
      "Valence Bond Theory",
      "Hybridisation (sp, sp², sp³, sp³d, sp³d²)",
      "Molecular Orbital Theory",
      "Bonding in homonuclear diatomic molecules",
      "Hydrogen bonding",
    ],
  },
  {
    name: "Thermodynamics",
    topics: [
      "Thermodynamic terms (system, surroundings, types)",
      "Thermodynamic state variables",
      "Internal energy as a state function",
      "Work, heat and their applications",
      "First law of thermodynamics",
      "Enthalpy and heat capacity (Cp, Cv)",
      "Measurement of ΔU and ΔH (calorimetry)",
      "Hess's law of constant heat summation",
      "Enthalpies of various reactions",
      "Bond, lattice and solution enthalpies",
      "Spontaneity and entropy",
      "Gibbs energy and spontaneity",
      "Gibbs energy and equilibrium",
    ],
  },
  {
    name: "Equilibrium",
    topics: [
      "Equilibrium in physical processes",
      "Equilibrium in chemical processes",
      "Law of chemical equilibrium and Kc",
      "Kp and relation with Kc",
      "Homogeneous and heterogeneous equilibria",
      "Reaction quotient and predicting direction",
      "Factors affecting equilibrium (Le Chatelier's principle)",
      "Acids and bases (Arrhenius, Brønsted-Lowry, Lewis)",
      "Ionization of acids and bases",
      "pH and pH calculations",
      "Common ion effect",
      "Buffer solutions",
      "Solubility equilibria and solubility product",
    ],
  },
  {
    name: "Redox Reactions",
    topics: [
      "Classical concept of oxidation and reduction",
      "Redox reactions in terms of electron transfer",
      "Oxidation number and rules for assigning",
      "Types of redox reactions",
      "Balancing redox reactions (oxidation number method)",
      "Balancing redox reactions (half-reaction method)",
      "Redox reactions and electrode processes",
    ],
  },
  {
    name: "Organic Chemistry – Some Basic Principles and Techniques",
    topics: [
      "Tetravalence of carbon and shapes of organic molecules",
      "Structural representations of organic compounds",
      "Classification of organic compounds",
      "IUPAC nomenclature of organic compounds",
      "Isomerism (structural)",
      "Stereoisomerism",
      "Fission of covalent bonds (homolytic and heterolytic)",
      "Free radicals, carbocations and carbanions",
      "Electrophiles and nucleophiles",
      "Inductive effect",
      "Electromeric effect",
      "Resonance and resonance effect",
      "Hyperconjugation",
      "Common types of organic reactions",
      "Methods of purification of organic compounds",
      "Qualitative analysis (detection of N, S, halogens)",
      "Quantitative analysis (estimation of C, H, N, halogens, S)",
    ],
  },
  {
    name: "Hydrocarbons",
    topics: [
      "Classification of hydrocarbons",
      "Alkanes — nomenclature and isomerism",
      "Alkanes — preparation",
      "Alkanes — physical and chemical properties",
      "Conformations of alkanes (Newman, Sawhorse)",
      "Alkenes — nomenclature, structure and isomerism",
      "Alkenes — preparation",
      "Alkenes — properties and electrophilic addition",
      "Markovnikov's rule and peroxide effect",
      "Alkynes — nomenclature and structure",
      "Alkynes — preparation and properties",
      "Aromatic hydrocarbons — structure of benzene",
      "Aromaticity",
      "Aromatic hydrocarbons — electrophilic substitution reactions",
      "Directive influence in monosubstituted benzene",
      "Carcinogenicity and toxicity of hydrocarbons",
    ],
  },
];

const maths: ChapterSeed[] = [
  {
    name: "Sets",
    topics: [
      "Sets and their representations",
      "Types of sets (empty, finite, infinite, equal)",
      "Subsets and intervals",
      "Power set",
      "Universal set",
      "Venn diagrams",
      "Union of sets",
      "Intersection of sets",
      "Difference of sets",
      "Complement of a set",
      "Algebraic properties of set operations",
      "Practical problems on union and intersection",
    ],
  },
  {
    name: "Relations and Functions",
    topics: [
      "Cartesian product of sets",
      "Relations",
      "Functions",
      "Domain, codomain and range",
      "Real-valued functions",
      "Standard functions and their graphs",
      "Algebra of real functions",
    ],
  },
  {
    name: "Trigonometric Functions",
    topics: [
      "Angles in degrees and radians",
      "Trigonometric functions on the unit circle",
      "Sign of trigonometric functions",
      "Domain and range of trigonometric functions",
      "Trigonometric identities",
      "Sum and difference formulae",
      "Multiple and submultiple angle formulae",
      "Trigonometric equations",
    ],
  },
  {
    name: "Complex Numbers and Quadratic Equations",
    topics: [
      "Complex numbers and their representation",
      "Algebra of complex numbers",
      "Modulus and conjugate of a complex number",
      "Argand plane and polar form",
      "Square root of a complex number",
      "Quadratic equations with real coefficients",
      "Quadratic equations with complex coefficients",
      "Nature of roots",
    ],
  },
  {
    name: "Linear Inequalities",
    topics: [
      "Linear inequalities in one variable",
      "Algebraic solutions of one-variable inequalities",
      "Graphical solution of two-variable inequalities",
      "Systems of linear inequalities in two variables",
    ],
  },
  {
    name: "Permutations and Combinations",
    topics: [
      "Fundamental principle of counting",
      "Permutations of distinct objects",
      "Permutations with non-distinct objects",
      "Combinations",
      "Applications of permutations and combinations",
    ],
  },
  {
    name: "Binomial Theorem",
    topics: [
      "Binomial theorem for positive integral indices",
      "General term of expansion",
      "Middle term(s)",
      "Properties of binomial coefficients",
      "Applications and special cases",
    ],
  },
  {
    name: "Sequences and Series",
    topics: [
      "Sequences and series",
      "Arithmetic Progression (AP)",
      "Arithmetic Mean (AM)",
      "Geometric Progression (GP)",
      "Sum of n terms of a GP",
      "Sum of an infinite GP",
      "Geometric Mean (GM)",
      "Relationship between AM and GM",
      "Sum of special series (Σn, Σn², Σn³)",
    ],
  },
  {
    name: "Straight Lines",
    topics: [
      "Slope of a line",
      "Angle between two lines",
      "Various forms of equation of a line",
      "General equation of a line",
      "Distance of a point from a line",
      "Distance between parallel lines",
      "Shifting of origin",
      "Family of lines through intersection",
    ],
  },
  {
    name: "Conic Sections",
    topics: [
      "Sections of a cone",
      "Circle",
      "Parabola",
      "Ellipse",
      "Hyperbola",
      "General second-degree equations",
    ],
  },
  {
    name: "Introduction to Three Dimensional Geometry",
    topics: [
      "Coordinate axes and planes in 3D",
      "Coordinates of a point in space",
      "Distance between two points",
      "Section formula in 3D",
    ],
  },
  {
    name: "Limits and Derivatives",
    topics: [
      "Intuitive idea of limits",
      "Algebra of limits",
      "Limits of polynomials and rational functions",
      "Limits of trigonometric functions",
      "Derivative as instantaneous rate of change",
      "Algebra of derivatives",
      "Derivative of polynomial functions",
      "Derivative of trigonometric functions",
    ],
  },
  {
    name: "Statistics",
    topics: [
      "Range as a measure of dispersion",
      "Mean deviation for ungrouped data",
      "Mean deviation for grouped data",
      "Variance and standard deviation",
      "Variance and SD for grouped data",
      "Coefficient of variation",
    ],
  },
  {
    name: "Probability",
    topics: [
      "Random experiments and outcomes",
      "Sample space",
      "Events",
      "Algebra of events",
      "Mutually exclusive and exhaustive events",
      "Axiomatic approach to probability",
      "Probability of equally likely outcomes",
      "Probability of 'not', 'and', 'or' events",
    ],
  },
];

const subjects = [
  { name: "Physics", short: "P", color: "#5aa9ff", chapters: physics },
  { name: "Chemistry", short: "C", color: "#5fd0a3", chapters: chemistry },
  { name: "Maths", short: "M", color: "#ffb86b", chapters: maths },
];

async function main() {
  const studentCount = await prisma.student.count();
  if (studentCount === 0) {
    await prisma.student.create({
      data: { name: "Bro", className: "11", board: "CBSE" },
    });
  }

  let totalTopics = 0;

  for (const s of subjects) {
    const subject = await prisma.subject.upsert({
      where: { name: s.name },
      update: { color: s.color, short: s.short },
      create: { name: s.name, short: s.short, color: s.color },
    });

    for (let i = 0; i < s.chapters.length; i++) {
      const ch = s.chapters[i];
      const existing = await prisma.chapter.findFirst({
        where: { name: ch.name, subjectId: subject.id },
      });
      const chapter = existing
        ? await prisma.chapter.update({
            where: { id: existing.id },
            data: { order: i },
          })
        : await prisma.chapter.create({
            data: { name: ch.name, subjectId: subject.id, order: i },
          });

      // Reconcile topics: keep existing matches, add missing, drop stale.
      await prisma.topic.deleteMany({
        where: {
          chapterId: chapter.id,
          name: { notIn: ch.topics },
        },
      });
      for (const t of ch.topics) {
        const exists = await prisma.topic.findFirst({
          where: { name: t, chapterId: chapter.id },
        });
        if (!exists) {
          await prisma.topic.create({
            data: { name: t, chapterId: chapter.id },
          });
        }
      }
      totalTopics += ch.topics.length;
    }
  }

  console.log(
    `Seed complete. Synced ${subjects.length} subjects, ${subjects.reduce(
      (n, s) => n + s.chapters.length,
      0
    )} chapters, ${totalTopics} topics.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
