import { BsGithub, BsInstagram, BsWhatsapp, BsLinkedin } from "react-icons/bs";

const Socmed = [
  {
    text: "Github",
    path: "https://github.com/kochan4php",
    btncolor: "hover:brightness-125 bg-[#3D4451] hover:bg-[#3D4451]",
    Icon: BsGithub,
  },
  {
    text: "Instagram",
    path: "https://instagram.com/kochan.php",
    btncolor:
      "hover:brightness-125 bg-gradient-to-r from-violet-600 via-pink-600 to-orange-600",
    Icon: BsInstagram,
  },
  {
    text: "WhatsApp",
    path: "https://wa.me/08988928260",
    btncolor: "hover:brightness-125 bg-[#28B13D] hover:bg-[#28B13D]",
    Icon: BsWhatsapp,
  },
  {
    text: "LinkedIn",
    path: "https://wa.me/08988928260",
    btncolor:
      "hover:brightness-125 bg-[rgb(0,115,177)] hover:bg-[rgb(0,115,177)]",
    Icon: BsLinkedin,
  },
];

export default Socmed;
