// Sample data. Verify prerequisites against the official U of A course catalogue.
export const courses = [
  {
    code: "CMPUT 101",
    name: "Introduction to Computing",
    level: 100,
    prereqs: [],
    description:
      "A gentle tour of how computers work, from binary and logic to a first taste of programming.",
    workload: "light",
  },
  {
    code: "CMPUT 174",
    name: "Introduction to Computation I",
    level: 100,
    prereqs: [],
    description:
      "Your first real programming course. Build small Python programs and learn to think in steps.",
    workload: "medium",
  },
  {
    code: "CMPUT 175",
    name: "Introduction to Computation II",
    level: 100,
    prereqs: ["CMPUT 174"],
    description:
      "Data structures, recursion, and object-oriented design with hands-on assignments.",
    workload: "medium",
  },
  {
    code: "MATH 125",
    name: "Linear Algebra I",
    level: 100,
    prereqs: [],
    description:
      "Vectors, matrices, and the surprisingly beautiful geometry hiding inside systems of equations.",
    workload: "medium",
  },
  {
    code: "MATH 144",
    name: "Calculus for the Mathematical Sciences",
    level: 100,
    prereqs: [],
    description:
      "Limits, derivatives, and integrals with a focus on the ideas behind the formulas.",
    workload: "medium",
  },
  {
    code: "STAT 151",
    name: "Introduction to Applied Statistics",
    level: 100,
    prereqs: [],
    description:
      "Make sense of data with distributions, confidence intervals, and hypothesis tests.",
    workload: "medium",
  },
  {
    code: "ENGL 102",
    name: "Introduction to Literary Analysis",
    level: 100,
    prereqs: [],
    description:
      "Close reading, lively discussion, and essays about stories, poems, and plays.",
    workload: "light",
  },
  {
    code: "PSYCH 104",
    name: "Basic Psychological Processes",
    level: 100,
    prereqs: [],
    description:
      "How brains sense, learn, remember, and feel. A popular science elective with fun examples.",
    workload: "light",
  },
  {
    code: "PHYS 124",
    name: "Mechanics",
    level: 100,
    prereqs: [],
    description:
      "Motion, forces, and energy. Labs included for students who like to see physics happen.",
    workload: "heavy",
  },
  {
    code: "BIOL 107",
    name: "Introduction to Cell Biology",
    level: 100,
    prereqs: [],
    description:
      "Cells, genes, and the machinery of life, with weekly labs and lots of new vocabulary.",
    workload: "medium",
  },
  {
    code: "CMPUT 201",
    name: "Practical Programming Methodology",
    level: 200,
    prereqs: ["CMPUT 175"],
    description:
      "Write larger programs with confidence: testing, debugging, C, memory, and good design habits.",
    workload: "heavy",
  },
  {
    code: "CMPUT 204",
    name: "Algorithms I",
    level: 200,
    prereqs: ["CMPUT 175", "MATH 125"],
    description:
      "Sorting, graphs, greedy algorithms, and proofs. The course where Big-O becomes your friend.",
    workload: "heavy",
  },
  {
    code: "CMPUT 229",
    name: "Computer Organization and Architecture I",
    level: 200,
    prereqs: ["CMPUT 174"],
    description:
      "What is really happening under your code? Assembly, memory, and processor pipelines.",
    workload: "heavy",
  },
  {
    code: "CMPUT 272",
    name: "Formal Systems and Logic in Computing Science",
    level: 200,
    prereqs: ["CMPUT 175"],
    description:
      "Logic, proofs, sets, and induction for writing software that is correct on purpose.",
    workload: "medium",
  },
  {
    code: "CMPUT 291",
    name: "Introduction to File and Database Management",
    level: 200,
    prereqs: ["CMPUT 175"],
    description:
      "Model real data, write SQL, and build the backend of apps that remember things.",
    workload: "medium",
  },
  {
    code: "CMPUT 210",
    name: "Introduction to Web Development",
    level: 200,
    prereqs: ["CMPUT 174"],
    description:
      "From HTML to APIs: build friendly little web apps and ship them to the world.",
    workload: "light",
  },
  {
    code: "MATH 214",
    name: "Calculus III",
    level: 200,
    prereqs: ["MATH 144"],
    description:
      "Sequences, series, and multivariable calculus. A prerequisite for many upper-year theory courses.",
    workload: "heavy",
  },
  {
    code: "MATH 225",
    name: "Linear Algebra II",
    level: 200,
    prereqs: ["MATH 125"],
    description:
      "Abstract vector spaces, eigenvalues, and the math behind graphics and machine learning.",
    workload: "medium",
  },
  {
    code: "STAT 252",
    name: "Introduction to Applied Statistics II",
    level: 200,
    prereqs: ["STAT 151"],
    description:
      "Regression, experimental design, and turning messy data into defensible conclusions.",
    workload: "medium",
  },
  {
    code: "ENGL 103",
    name: "Introduction to Poetry",
    level: 200,
    prereqs: ["ENGL 102"],
    description:
      "Read poems closely, talk about rhythm and image, and try writing a few of your own.",
    workload: "light",
  },
  {
    code: "CMPUT 301",
    name: "Introduction to Software Engineering",
    level: 300,
    prereqs: ["CMPUT 201", "CMPUT 291"],
    description:
      "Work in a team, run a real project, and learn the habits that make software maintainable.",
    workload: "heavy",
  },
  {
    code: "CMPUT 304",
    name: "Algorithms II",
    level: 300,
    prereqs: ["CMPUT 204"],
    description:
      "Advanced algorithm design: dynamic programming, network flow, and approximation ideas.",
    workload: "heavy",
  },
  {
    code: "CMPUT 325",
    name: "Non-Procedural Programming Languages",
    level: 300,
    prereqs: ["CMPUT 204"],
    description:
      "Declarative thinking with functional and logic programming languages.",
    workload: "medium",
  },
  {
    code: "CMPUT 340",
    name: "Introduction to Numerical Methods",
    level: 300,
    prereqs: ["CMPUT 201", "MATH 214"],
    description:
      "Make computers approximate math safely, from floating point to differential equations.",
    workload: "heavy",
  },
  {
    code: "CMPUT 350",
    name: "Advanced Games Programming",
    level: 300,
    prereqs: ["CMPUT 272"],
    description:
      "Build a game from physics to AI. Expect a big project and a very fun demo day.",
    workload: "heavy",
  },
  {
    code: "CMPUT 361",
    name: "Introduction to Information Retrieval",
    level: 300,
    prereqs: ["CMPUT 272"],
    description:
      "Search engines, ranking, embeddings, and how to find the right document in a pile.",
    workload: "medium",
  },
  {
    code: "CMPUT 379",
    name: "Operating System Concepts",
    level: 300,
    prereqs: ["CMPUT 201", "CMPUT 229"],
    description:
      "Processes, memory, and concurrency. The course where your laptop stops feeling magical.",
    workload: "heavy",
  },
  {
    code: "MATH 311",
    name: "Numerical Analysis I",
    level: 300,
    prereqs: ["MATH 214"],
    description:
      "Algorithms for solving equations and integrals, plus the error analysis to trust them.",
    workload: "heavy",
  },
  {
    code: "CMPUT 401",
    name: "Software Process and Product Management",
    level: 400,
    prereqs: ["CMPUT 301"],
    description:
      "Run a real client project end to end and practice the messy human side of software.",
    workload: "heavy",
  },
  {
    code: "CMPUT 412",
    name: "Experimental Mobile Robotics",
    level: 400,
    prereqs: ["CMPUT 340"],
    description:
      "Program robots that perceive, plan, and move. A capstone favourite for hands-on builders.",
    workload: "heavy",
  },
  {
    code: "CMPUT 455",
    name: "Games, Agents, and AI",
    level: 400,
    prereqs: ["CMPUT 350"],
    description:
      "Search, planning, and learning for game-playing agents. Build something that beats you.",
    workload: "heavy",
  },
  {
    code: "CMPUT 466",
    name: "Machine Learning",
    level: 400,
    prereqs: ["CMPUT 304", "STAT 252"],
    description:
      "Models that learn from data, with the math and experiments to know when they work.",
    workload: "heavy",
  },
];
