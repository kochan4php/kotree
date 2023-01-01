/**
 * © Copyright by Deo Subarno (Kochan.php | kochan4php)
 * Don't edit this code!
 */

import { BsGithub, BsInstagram, BsWhatsapp, BsLinkedin } from "react-icons/bs";
import { SiGitlab } from "react-icons/si";
import { MdWork } from "react-icons/md";

const Socmed = [
  {
    text: "Github",
    path: "https://github.com/kochan4php",
    btncolor: "hover:brightness-90 bg-[#3D4451] hover:bg-[#3D4451]",
    Icon: BsGithub,
  },
  {
    text: "Gitlab",
    path: "https://gitlab.com/aprodeosubarno",
    btncolor:
      "hover:brightness-90 bg-gradient-to-r from-[#E24329] via-[#FC6D26] to-[#FCA326]",
    Icon: SiGitlab,
  },
  {
    text: "Instagram",
    path: "https://instagram.com/kochan.php",
    btncolor:
      "hover:brightness-90 bg-gradient-to-r from-violet-600 via-pink-600 to-orange-600",
    Icon: BsInstagram,
  },
  {
    text: "WhatsApp",
    path: "https://wa.me/+628988928260",
    btncolor: "hover:brightness-90 bg-[#28B13D] hover:bg-[#28B13D]",
    Icon: BsWhatsapp,
  },
  {
    text: "LinkedIn",
    path: "https://www.linkedin.com/in/aphrodeo-subarno/",
    btncolor:
      "hover:brightness-90 bg-[rgb(0,115,177)] hover:bg-[rgb(0,115,177)]",
    Icon: BsLinkedin,
  },
  {
    text: "Portfolio",
    path: "/",
    btncolor:
      "hover:brightness-90 bg-gradient-to-r from-[#f77062] to-[#fe5196]",
    Icon: MdWork,
  },
];

export default Socmed;
