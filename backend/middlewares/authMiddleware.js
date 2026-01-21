import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: decoded.id }; // 🔴 THIS LINE IS REQUIRED
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// export const donorAuth = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "Authorization token missing" });
//     }

//     const token = authHeader.split(" ")[1];

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // const user = await Donor.findById(decoded.id);
//     // if (!user) {
//     //   return res.status(401).json({ message: "Invalid token" });
//     // }

//     req.user ={ id: decoded.id }; // 🔑 important
//     next();
//   } catch (error) {
//     console.error("Auth Middleware Error:", error);
//     return res.status(401).json({ message: "Unauthorized", error: error.message });
//   }
// };
export const donorAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id }; // ID only
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
