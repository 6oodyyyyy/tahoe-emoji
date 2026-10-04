/* Tahoe emoji picker — UI logic */
(function () {
  'use strict';
  var COLS = 5;
  var HOLD_MS = 450;

  /* ---------- SF-Symbol-style outline icons (stroke 1.5, round caps) ---------- */
  function ic(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }
  var ICONS = {
  clock: "<svg viewBox=\"0 0 25.8008 25.459\" fill=\"currentColor\"> <g> <rect height=\"25.459\" opacity=\"0\" width=\"25.8008\" x=\"0\" y=\"0\"/> <path d=\"M12.7148 25.4395C19.7363 25.4395 25.4395 19.7461 25.4395 12.7246C25.4395 5.70312 19.7363 0 12.7148 0C5.69336 0 0 5.70312 0 12.7246C0 19.7461 5.69336 25.4395 12.7148 25.4395ZM12.7148 23.623C6.68945 23.623 1.81641 18.75 1.81641 12.7246C1.81641 6.69922 6.68945 1.82617 12.7148 1.82617C18.7402 1.82617 23.6133 6.69922 23.6133 12.7246C23.6133 18.75 18.7402 23.623 12.7148 23.623Z\" /> <path d=\"M5.95703 14.0039L12.7051 14.0039C13.1348 14.0039 13.4668 13.6719 13.4668 13.2422L13.4668 4.53125C13.4668 4.11133 13.1348 3.7793 12.7051 3.7793C12.2949 3.7793 11.9531 4.11133 11.9531 4.53125L11.9531 12.4902L5.95703 12.4902C5.52734 12.4902 5.20508 12.8223 5.20508 13.2422C5.20508 13.6719 5.52734 14.0039 5.95703 14.0039Z\" /> </g> </svg>",
  smiley: "<svg viewBox=\"0 0 25.8008 25.459\" fill=\"currentColor\"> <g> <rect height=\"25.459\" opacity=\"0\" width=\"25.8008\" x=\"0\" y=\"0\"/> <path d=\"M12.7148 25.4395C19.7363 25.4395 25.4395 19.7461 25.4395 12.7246C25.4395 5.70312 19.7363 0 12.7148 0C5.69336 0 0 5.70312 0 12.7246C0 19.7461 5.69336 25.4395 12.7148 25.4395ZM12.7148 23.623C6.68945 23.623 1.81641 18.75 1.81641 12.7246C1.81641 6.69922 6.68945 1.82617 12.7148 1.82617C18.7402 1.82617 23.6133 6.69922 23.6133 12.7246C23.6133 18.75 18.7402 23.623 12.7148 23.623Z\" /> <path d=\"M12.7051 18.9648C15.2832 18.9648 17.0312 17.2266 17.0312 16.4258C17.0312 16.1621 16.7676 16.0449 16.543 16.1621C15.6738 16.709 14.5215 17.2754 12.7051 17.2754C10.8887 17.2754 9.74609 16.6992 8.87695 16.1621C8.64258 16.0449 8.37891 16.1621 8.37891 16.4258C8.37891 17.2266 10.1367 18.9648 12.7051 18.9648ZM8.95508 11.5723C9.7168 11.5723 10.4004 10.8691 10.4004 9.90234C10.4004 8.93555 9.72656 8.22266 8.95508 8.22266C8.19336 8.22266 7.53906 8.93555 7.53906 9.90234C7.53906 10.8691 8.20312 11.5723 8.95508 11.5723ZM16.4551 11.5723C17.2266 11.5723 17.9004 10.8691 17.9004 9.90234C17.9004 8.93555 17.2266 8.22266 16.4551 8.22266C15.6934 8.22266 15.0391 8.93555 15.0391 9.90234C15.0391 10.8691 15.7031 11.5723 16.4551 11.5723Z\" /> </g> </svg>",
  person: "<svg viewBox=\"0 0 22.1875 23.1348\" fill=\"currentColor\"> <g> <rect height=\"23.1348\" opacity=\"0\" width=\"22.1875\" x=\"0\" y=\"0\"/> <path d=\"M2.86133 23.125L18.9648 23.125C20.9082 23.125 21.8262 22.5195 21.8262 21.2109C21.8262 17.9199 17.6758 13.1934 10.9082 13.1934C4.15039 13.1934 0 17.9199 0 21.2109C0 22.5195 0.917969 23.125 2.86133 23.125ZM2.38281 21.4941C1.9043 21.4941 1.72852 21.3672 1.72852 21.0156C1.72852 18.7402 5.03906 14.834 10.9082 14.834C16.7871 14.834 20.0977 18.7402 20.0977 21.0156C20.0977 21.3672 19.9219 21.4941 19.4434 21.4941ZM10.9277 11.5332C13.8867 11.5332 16.2695 8.92578 16.2695 5.69336C16.2695 2.51953 13.8867 0 10.9277 0C7.97852 0 5.57617 2.55859 5.57617 5.71289C5.57617 8.93555 7.96875 11.5332 10.9277 11.5332ZM10.9277 9.90234C8.94531 9.90234 7.30469 8.06641 7.30469 5.71289C7.30469 3.42773 8.93555 1.63086 10.9277 1.63086C12.9199 1.63086 14.541 3.39844 14.541 5.69336C14.541 8.04688 12.9102 9.90234 10.9277 9.90234Z\" /> </g> </svg>",
  paw: "<svg viewBox=\"0 0 27.4512 26.6895\" fill=\"currentColor\"> <g> <rect height=\"26.6895\" opacity=\"0\" width=\"27.4512\" x=\"0\" y=\"0\"/> <path d=\"M8.54492 26.6406C9.80469 26.6406 10.6934 26.3184 11.4551 25.9961C12.207 25.6836 12.8027 25.3613 13.5254 25.3613C14.2578 25.3613 14.8535 25.6836 15.6055 25.9961C16.3672 26.3184 17.2559 26.6406 18.5156 26.6406C21.1816 26.6406 23.2129 24.7168 23.2129 22.1777C23.2129 19.6484 21.7285 18.4277 20.4492 17.3926C19.7754 16.8652 19.1797 16.3867 18.8281 15.8008C18.5156 15.2734 18.252 14.6777 17.9883 14.0625C17.1582 12.1582 16.2598 10.1172 13.5254 10.1172C10.791 10.1172 9.89258 12.168 9.07227 14.0625C8.80859 14.668 8.56445 15.2539 8.26172 15.7617C7.90039 16.3574 7.28516 16.8555 6.61133 17.3926C5.32227 18.4277 3.84766 19.6582 3.84766 22.1777C3.84766 24.7168 5.87891 26.6406 8.54492 26.6406ZM8.54492 25.0684C6.72852 25.0684 5.41992 23.8574 5.41992 22.1777C5.41992 19.1406 8.03711 19.1797 9.54102 16.6309C10.6836 14.6973 11.1133 11.6895 13.5254 11.6895C15.957 11.6895 16.377 14.6973 17.5488 16.6699C19.0234 19.1797 21.6406 19.1406 21.6406 22.1777C21.6406 23.8574 20.332 25.0684 18.5156 25.0684C16.6699 25.0684 15.498 23.7988 13.5254 23.7988C11.5625 23.7988 10.3906 25.0684 8.54492 25.0684ZM0 11.9922C0 14.8145 1.30859 16.709 3.30078 16.709C5.29297 16.709 6.62109 14.8145 6.62109 11.9922C6.62109 9.16016 5.29297 7.27539 3.30078 7.27539C1.30859 7.27539 0 9.16016 0 11.9922ZM1.51367 11.9922C1.51367 10.0586 2.2168 8.7793 3.30078 8.7793C4.38477 8.7793 5.10742 10.0586 5.10742 11.9922C5.10742 13.916 4.38477 15.1953 3.30078 15.1953C2.2168 15.1953 1.51367 13.9258 1.51367 11.9922ZM6.13281 4.69727C6.13281 7.54883 7.44141 9.42383 9.42383 9.42383C11.416 9.42383 12.7441 7.5293 12.7441 4.69727C12.7441 1.875 11.4258 0 9.42383 0C7.44141 0 6.13281 1.86523 6.13281 4.69727ZM7.63672 4.69727C7.63672 2.7832 8.34961 1.51367 9.42383 1.51367C10.5078 1.51367 11.2305 2.79297 11.2305 4.69727C11.2305 6.63086 10.5078 7.91016 9.42383 7.91016C8.34961 7.91016 7.63672 6.63086 7.63672 4.69727ZM14.3457 4.69727C14.3457 7.5293 15.6738 9.42383 17.666 9.42383C19.6582 9.42383 20.9668 7.54883 20.9668 4.69727C20.9668 1.86523 19.6582 0 17.666 0C15.6641 0 14.3457 1.875 14.3457 4.69727ZM15.8594 4.69727C15.8594 2.79297 16.582 1.51367 17.666 1.51367C18.75 1.51367 19.4531 2.7832 19.4531 4.69727C19.4531 6.63086 18.75 7.91016 17.666 7.91016C16.582 7.91016 15.8594 6.63086 15.8594 4.69727ZM20.4785 11.9922C20.4785 14.8145 21.7969 16.709 23.7891 16.709C25.7812 16.709 27.0898 14.8145 27.0898 11.9922C27.0898 9.16016 25.7812 7.27539 23.7891 7.27539C21.7969 7.27539 20.4785 9.16016 20.4785 11.9922ZM21.9922 11.9922C21.9922 10.0586 22.7051 8.7793 23.7891 8.7793C24.873 8.7793 25.5762 10.0586 25.5762 11.9922C25.5762 13.9258 24.873 15.1953 23.7891 15.1953C22.7051 15.1953 21.9922 13.916 21.9922 11.9922Z\" /> </g> </svg>",
  apple: "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 8.5c-1.2-1.6-3.2-2.1-4.8-.9-1.5 1.1-1.9 3.3-1 6 .8 2.5 2.1 4.4 3.5 4.4.8 0 1.1-.5 2.3-.5s1.5.5 2.3.5c1.4 0 2.7-1.9 3.5-4.4.9-2.7.5-4.9-1-6-1.6-1.2-3.6-.7-4.8.9z\"/><path d=\"M12 8.5c0-2 .9-3.5 2.6-4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/></svg>",
  soccer: "<svg viewBox=\"0 0 25.8008 25.459\" fill=\"currentColor\"> <g> <rect height=\"25.459\" opacity=\"0\" width=\"25.8008\" x=\"0\" y=\"0\"/> <path d=\"M12.7148 7.67578L7.8125 11.4551L9.77539 17.5L15.6641 17.5L17.6172 11.4551ZM17.1387 1.88477L12.7051 0.488281L8.26172 1.88477L12.7051 5.46875ZM12.0996 0.9375L12.0996 9.12109L13.3398 9.12109L13.3398 0.9375ZM21.5137 5.06836L19.8633 10.5176L24.834 13.3008L23.9355 8.13477ZM24.2773 9.38477L23.8086 8.25195L16.2207 11.3184L16.6895 12.4609ZM15.6152 24.209L19.834 22.3926L22.7832 18.7402L16.9043 18.6621ZM20.166 21.8555L15.1367 15.4004L14.1406 16.1523L19.1895 22.5977ZM9.80469 24.1699L8.51562 18.623L2.63672 18.7012L5.5957 22.3535ZM5.25391 21.8164L6.24023 22.5586L11.2793 16.1133L10.2832 15.3613ZM3.91602 5.06836L1.50391 8.13477L0.605469 13.3008L5.57617 10.5176ZM1.15234 9.38477L8.74023 12.4609L9.20898 11.3184L1.62109 8.25195ZM12.7148 25.4395C19.7363 25.4395 25.4395 19.7461 25.4395 12.7246C25.4395 5.70312 19.7363 0 12.7148 0C5.69336 0 0 5.70312 0 12.7246C0 19.7461 5.69336 25.4395 12.7148 25.4395ZM12.7148 23.9551C6.51367 23.9551 1.48438 18.9258 1.48438 12.7246C1.48438 6.51367 6.51367 1.48438 12.7148 1.48438C18.9258 1.48438 23.9551 6.51367 23.9551 12.7246C23.9551 18.9258 18.9258 23.9551 12.7148 23.9551Z\" /> </g> </svg>",
  car: "<svg viewBox=\"0 0 29.8535 23.1543\" fill=\"currentColor\"> <g> <rect height=\"23.1543\" opacity=\"0\" width=\"29.8535\" x=\"0\" y=\"0\"/> <path d=\"M5.60547 7.80273C5.50781 8.21289 5.67383 8.4082 6.14258 8.37891C8.21289 8.23242 10.5859 8.125 14.7461 8.125C18.9062 8.125 21.2793 8.23242 23.3496 8.37891C23.8184 8.4082 23.9844 8.21289 23.8965 7.80273C23.5645 6.34766 22.998 4.6582 22.5977 3.96484C22.2559 3.36914 21.8359 3.07617 21.0938 2.96875C20.1562 2.8418 18.0469 2.76367 14.7461 2.76367C11.4453 2.76367 9.33594 2.8418 8.39844 2.96875C7.65625 3.07617 7.23633 3.36914 6.89453 3.96484C6.50391 4.6582 5.92773 6.34766 5.60547 7.80273ZM5.66406 16.3184C6.75781 16.3184 7.58789 15.498 7.58789 14.3945C7.58789 13.3008 6.75781 12.4707 5.66406 12.4707C4.56055 12.4707 3.73047 13.3008 3.73047 14.3945C3.73047 15.498 4.56055 16.3184 5.66406 16.3184ZM11.4746 15.8984L18.0176 15.8984C18.8379 15.8984 19.4043 15.332 19.4043 14.5215C19.4043 13.7012 18.8379 13.1348 18.0176 13.1348L11.4746 13.1348C10.6543 13.1348 10.0977 13.7012 10.0977 14.5215C10.0977 15.332 10.6543 15.8984 11.4746 15.8984ZM23.8379 16.3184C24.9316 16.3184 25.7617 15.498 25.7617 14.3945C25.7617 13.3008 24.9316 12.4707 23.8379 12.4707C22.7344 12.4707 21.9043 13.3008 21.9043 14.3945C21.9043 15.498 22.7344 16.3184 23.8379 16.3184ZM14.7461 19.7461C18.9258 19.7461 24.541 19.5312 26.9238 19.2578C28.5645 19.0723 29.4922 18.1934 29.4922 16.6113L29.4922 14.3945C29.4922 12.2363 29.0332 11.084 27.9199 9.63867L26.8457 8.24219C26.3867 5.97656 25.5469 3.58398 25.1074 2.65625C24.4434 1.24023 23.1445 0.449219 21.543 0.234375C20.6934 0.117188 17.9004 0.0488281 14.7461 0.0488281C11.5918 0.0488281 8.79883 0.126953 7.94922 0.234375C6.34766 0.429688 5.04883 1.24023 4.38477 2.65625C3.94531 3.58398 3.11523 5.97656 2.64648 8.24219L1.57227 9.63867C0.458984 11.084 0 12.2363 0 14.3945L0 16.6113C0 18.1934 0.927734 19.0723 2.56836 19.2578C4.95117 19.5312 10.5664 19.7461 14.7461 19.7461ZM14.7461 18.3105C10.5371 18.3105 5.01953 18.1152 2.92969 17.8516C1.83594 17.7246 1.43555 17.1875 1.43555 16.2207L1.43555 14.3945C1.43555 12.6465 1.71875 11.8164 2.71484 10.5176L3.98438 8.84766C4.3457 6.93359 5.16602 4.4043 5.68359 3.31055C6.11328 2.40234 6.93359 1.83594 8.125 1.68945C8.92578 1.60156 11.5039 1.48438 14.7461 1.48438C17.9883 1.48438 20.6055 1.60156 21.3477 1.68945C22.5684 1.8457 23.3789 2.41211 23.8086 3.31055C24.3359 4.4043 25.1465 6.93359 25.5078 8.84766L26.7773 10.5176C27.7734 11.8164 28.0566 12.6465 28.0566 14.3945L28.0566 16.2207C28.0566 17.1875 27.6562 17.7246 26.5625 17.8516C24.4727 18.1055 18.9648 18.3105 14.7461 18.3105ZM2.28516 23.1543L3.75 23.1543C4.67773 23.1543 5.39062 22.4414 5.39062 21.5234L5.39062 18.6816L0.644531 18.0078L0.644531 21.5234C0.644531 22.4316 1.35742 23.1543 2.28516 23.1543ZM25.7422 23.1543L27.207 23.1543C28.1348 23.1543 28.8477 22.4414 28.8477 21.5234L28.8477 18.0078L24.1016 18.6816L24.1016 21.5234C24.1016 22.4414 24.8145 23.1543 25.7422 23.1543Z\" /> </g> </svg>",
  bulb: "<svg viewBox=\"0 0 17.0117 29.9121\" fill=\"currentColor\"> <g> <rect height=\"29.9121\" opacity=\"0\" width=\"17.0117\" x=\"0\" y=\"0\"/> <path d=\"M0 7.66602C0 12.3633 2.87109 13.623 3.66211 22.1582C3.70117 22.5977 3.93555 22.8613 4.41406 22.8613L12.2363 22.8613C12.7148 22.8613 12.9492 22.5977 12.9883 22.1582C13.7793 13.623 16.6504 12.3633 16.6504 7.66602C16.6504 3.41797 12.9785 0 8.32031 0C3.67188 0 0 3.41797 0 7.66602ZM1.63086 7.66602C1.63086 4.21875 4.69727 1.63086 8.32031 1.63086C11.9531 1.63086 15.0195 4.21875 15.0195 7.66602C15.0195 11.3086 12.5488 12.3047 11.4844 21.2305L5.16602 21.2305C4.0918 12.3047 1.63086 11.3086 1.63086 7.66602ZM4.4043 25.4492L12.2461 25.4492C12.627 25.4492 12.9199 25.1465 12.9199 24.7656C12.9199 24.3848 12.627 24.082 12.2461 24.082L4.4043 24.082C4.02344 24.082 3.73047 24.3848 3.73047 24.7656C3.73047 25.1465 4.02344 25.4492 4.4043 25.4492ZM8.32031 29.0234C10.2637 29.0234 11.8359 28.0859 11.9434 26.6699L4.70703 26.6699C4.79492 28.0859 6.36719 29.0234 8.32031 29.0234Z\" /> </g> </svg>",
  heart: "<svg viewBox=\"0 0 25.0879 23.4668\" fill=\"currentColor\"> <g> <rect height=\"23.4668\" opacity=\"0\" width=\"25.0879\" x=\"0\" y=\"0\"/> <path d=\"M0 8.1543C0 13.457 4.55078 18.6523 11.543 23.1543C11.7871 23.3105 12.1289 23.4668 12.3633 23.4668C12.6074 23.4668 12.9492 23.3105 13.1934 23.1543C20.1758 18.6523 24.7266 13.457 24.7266 8.1543C24.7266 3.79883 21.7285 0.693359 17.7148 0.693359C15.4199 0.693359 13.4668 1.8457 12.3633 3.61328C11.2695 1.85547 9.31641 0.693359 7.01172 0.693359C2.99805 0.693359 0 3.79883 0 8.1543ZM1.72852 8.1543C1.72852 4.73633 3.96484 2.42188 6.99219 2.42188C9.3457 2.42188 10.7617 3.88672 11.6113 5.26367C11.9043 5.71289 12.0996 5.84961 12.3633 5.84961C12.6367 5.84961 12.8027 5.70312 13.125 5.26367C14.0137 3.90625 15.3906 2.42188 17.7344 2.42188C20.7617 2.42188 22.998 4.73633 22.998 8.1543C22.998 12.8711 18.0566 17.8906 12.5977 21.5234C12.4902 21.5918 12.4121 21.6504 12.3633 21.6504C12.3145 21.6504 12.2363 21.5918 12.1289 21.5234C6.66992 17.8906 1.72852 12.8711 1.72852 8.1543Z\" /> </g> </svg>",
  flag: "<svg viewBox=\"0 0 22.9492 24.3457\" fill=\"currentColor\"> <g> <rect height=\"24.3457\" opacity=\"0\" width=\"22.9492\" x=\"0\" y=\"0\"/> <path d=\"M1.8457 24.3457C2.30469 24.3457 2.66602 23.9746 2.66602 23.5156L2.66602 16.3086C3.02734 16.2012 4.19922 15.7129 6.12305 15.7129C10.7422 15.7129 13.5938 17.9785 18.0078 17.9785C19.9121 17.9785 20.6836 17.7637 21.6016 17.3535C22.4121 16.9824 22.9492 16.3867 22.9492 15.3613L22.9492 2.73438C22.9492 2.09961 22.4414 1.74805 21.7871 1.74805C21.1816 1.74805 20.0195 2.29492 17.8516 2.29492C13.4277 2.29492 10.5762 0.0292969 5.9668 0.0292969C4.0625 0.0292969 3.30078 0.244141 2.38281 0.654297C1.5625 1.02539 1.02539 1.62109 1.02539 2.64648L1.02539 23.5156C1.02539 23.9648 1.40625 24.3457 1.8457 24.3457ZM18.0078 16.3379C13.7793 16.3379 10.8887 14.082 6.12305 14.082C4.80469 14.082 3.57422 14.2285 2.66602 14.5703L2.66602 2.66602C2.86133 2.23633 3.99414 1.66992 5.9668 1.66992C10.3906 1.66992 13.2812 3.92578 17.8516 3.92578C19.1797 3.92578 20.3027 3.7793 21.3184 3.48633L21.3184 15.3418C21.123 15.7715 19.9902 16.3379 18.0078 16.3379Z\" /> </g> </svg>",
  more: "<svg viewBox=\"0 0 14.873 21.3184\" fill=\"currentColor\"> <g> <rect height=\"21.3184\" opacity=\"0\" width=\"14.873\" x=\"0\" y=\"0\"/> <path d=\"M14.873 10.6543C14.873 10.3711 14.7656 10.1367 14.5605 9.94141L4.52148 0.283203C4.33594 0.0976562 4.10156 0 3.82812 0C3.28125 0 2.85156 0.410156 2.85156 0.966797C2.85156 1.23047 2.95898 1.47461 3.13477 1.65039L12.4902 10.6543L3.13477 19.6484C2.95898 19.8242 2.85156 20.0586 2.85156 20.332C2.85156 20.8887 3.28125 21.3086 3.82812 21.3086C4.10156 21.3086 4.33594 21.2012 4.52148 21.0254L14.5605 11.3672C14.7656 11.1621 14.873 10.9277 14.873 10.6543Z\" /> </g> </svg>"
};



  /* Tabs: Tahoe order — Smileys first, then Recents, then groups */
  var TABS = [
    { id: 'recent', icon: 'clock', name: 'Frequently Used' },
    { id: 0, icon: 'smiley', name: 'Smileys & People' },
    { id: 1, icon: 'paw', name: 'Animals & Nature' },
    { id: 2, icon: 'apple', name: 'Food & Drink' },
    { id: 3, icon: 'soccer', name: 'Activity' },
    { id: 4, icon: 'car', name: 'Travel & Places' },
    { id: 5, icon: 'bulb', name: 'Objects' },
    { id: 6, icon: 'heart', name: 'Symbols' },
    { id: 7, icon: 'flag', name: 'Flags' },
    { id: 'more', icon: 'more', name: 'Expand' }
  ];

  /* ---------- bridge (pywebview or mock for testing) ----------
     NOTE: pywebview injects window.pywebview *after* the page starts
     loading, so binding api once at parse time can permanently fall back
     to the mock (Esc / insert then silently do nothing). Bind lazily. */
  var MOCK = {
    getRecents: function () { return Promise.resolve(['\uD83D\uDE00', '\uD83D\uDE02', '\u2764\uFE0F', '\uD83D\uDC4D', '\uD83C\uDF89']); },
    getConfig: function () { return Promise.resolve({ accent: '#0A84FF', lastCategory: 0 }); },
    addRecent: function () { return Promise.resolve(); },
    setLastCategory: function () { return Promise.resolve(); },
    insert: function (e) { console.log('[mock] insert', e); return Promise.resolve(); },
    hide: function () { console.log('[mock] hide'); return Promise.resolve(); },
    openFullViewer: function () { console.log('[mock] openFullViewer'); return Promise.resolve(); }
  };
  var api = MOCK;
  function bindApi() {
    if (window.pywebview && window.pywebview.api) {
      api = window.pywebview.api;
      return true;
    }
    return false;
  }

  /* ---------- state ---------- */
  var recents = [];
  var lastCat = 0;
  var cat = 0;
  var query = '';
  var items = [];   /* currently displayed emoji objects */
  var hi = -1;      /* keyboard highlight index */

  var gridInner = document.getElementById('gridInner');
  var grid = document.getElementById('grid');
  var searchInput = document.getElementById('search');
  var clearBtn = document.getElementById('clearBtn');
  var catbar = document.getElementById('catbar');
  var tonePop = document.getElementById('tonePop');
  var panel = document.getElementById('panel');

  var byChar = {};
  (window.EMOJI_DATA || []).forEach(function (e) { byChar[e.e] = e; });

  /* ---------- rendering ---------- */
  function currentItems() {
    var data = window.EMOJI_DATA || [];
    if (query) {
      var q = query.toLowerCase();
      var out = [];
      for (var i = 0; i < data.length && out.length < 400; i++) {
        var e = data[i];
        if (e.n.indexOf(q) !== -1 || e.k.indexOf(q) !== -1) out.push(e);
      }
      return out;
    }
    if (cat === 'recent') {
      var r = recents.map(function (ch) { return byChar[ch]; })
        .filter(function (e) { return !!e; });
      /* recents first, then the full set so the panel never looks empty */
      var seen = {};
      r.forEach(function (e) { seen[e.e] = 1; });
      return r.concat(data.filter(function (e) { return !seen[e.e]; }));
    }
    return data.filter(function (e) { return e.g === cat; });
  }

  function render() {
    items = currentItems();
    hi = -1;
    gridInner.innerHTML = '';
    if (!items.length) {
      var d = document.createElement('div');
      d.className = 'grid-empty';
      d.textContent = 'No results';
      gridInner.appendChild(d);
      return;
    }
    var frag = document.createDocumentFragment();
    items.forEach(function (e, idx) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.idx = idx;
      var hit = document.createElement('div');
      hit.className = 'hit';
      hit.textContent = e.e;
      cell.appendChild(hit);
      frag.appendChild(cell);
    });
    gridInner.appendChild(frag);
    grid.scrollTop = 0;
  }

  function setHi(i) {
    var cells = gridInner.children;
    if (hi >= 0 && cells[hi]) cells[hi].classList.remove('kb');
    hi = Math.max(0, Math.min(i, items.length - 1));
    if (cells[hi]) {
      cells[hi].classList.add('kb');
      cells[hi].scrollIntoView({ block: 'nearest' });
    }
  }

  function renderCatbar() {
    catbar.innerHTML = '';
    TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'cat' + (t.id === cat ? ' active' : '');
      b.title = t.name;
      b.innerHTML = ICONS[t.icon];
      b.addEventListener('click', function () { onTab(t.id); });
      catbar.appendChild(b);
    });
  }

  function onTab(id) {
    if (id === 'more') { api.openFullViewer(); return; }
    cat = id;
    lastCat = id;
    query = '';
    searchInput.value = '';
    clearBtn.hidden = true;
    api.setLastCategory(id);
    renderCatbar();
    render();
  }

  /* ---------- insert ---------- */
  function doInsert(e) {
    hideTonePop();
    api.addRecent(e.e);
    // update local recents immediately
    recents = [e.e].concat(recents.filter(function (c) { return c !== e.e; })).slice(0, 32);
    api.insert(e.e);
  }

  /* ---------- skin-tone popover ---------- */
  var holdTimer = null;
  var holdCell = null;

  function hideTonePop() {
    tonePop.hidden = true;
    tonePop.innerHTML = '';
  }

  function showTonePop(cell, emoji) {
    if (!emoji.s || !emoji.s.length) return;
    tonePop.innerHTML = '';
    var variants = [emoji.e].concat(emoji.s);
    variants.forEach(function (ch) {
      var c = document.createElement('div');
      c.className = 'cell';
      var h = document.createElement('div');
      h.className = 'hit';
      h.textContent = ch;
      c.appendChild(h);
      c.addEventListener('pointerup', function (ev) {
        ev.stopPropagation();
        doInsert({ e: ch });
      });
      tonePop.appendChild(c);
    });
    // position above the cell, inside the panel
    var pr = panel.getBoundingClientRect();
    var cr = cell.getBoundingClientRect();
    var pw = variants.length * 46 + 10;
    var left = cr.left - pr.left + cr.width / 2 - pw / 2;
    left = Math.max(6, Math.min(left, 336 - pw - 6));
    var top = cr.top - pr.top - 56;
    if (top < 4) top = cr.top - pr.top + cr.height + 6;
    tonePop.style.left = left + 'px';
    tonePop.style.top = top + 'px';
    tonePop.style.width = pw + 'px';
    tonePop.hidden = false;
  }

  gridInner.addEventListener('pointerdown', function (ev) {
    var cell = ev.target.closest('.cell');
    if (!cell || cell.closest('.tone-pop')) return;
    var idx = +cell.dataset.idx;
    var emoji = items[idx];
    if (!emoji) return;
    holdCell = cell;
    clearTimeout(holdTimer);
    if (emoji.s && emoji.s.length) {
      holdTimer = setTimeout(function () {
        showTonePop(cell, emoji);
        holdCell = null;
      }, HOLD_MS);
    }
  });

  gridInner.addEventListener('pointerup', function (ev) {
    clearTimeout(holdTimer);
    if (!tonePop.hidden) return; // popover handles its own clicks
    var cell = ev.target.closest('.cell');
    if (!cell || cell.closest('.tone-pop')) return;
    if (cell !== holdCell && holdCell) return;
    var idx = +cell.dataset.idx;
    if (items[idx]) doInsert(items[idx]);
    holdCell = null;
  });

  gridInner.addEventListener('contextmenu', function (ev) {
    var cell = ev.target.closest('.cell');
    if (!cell || cell.closest('.tone-pop')) return;
    ev.preventDefault();
    clearTimeout(holdTimer);
    var idx = +cell.dataset.idx;
    if (items[idx] && items[idx].s) showTonePop(cell, items[idx]);
  });

  document.addEventListener('pointerdown', function (ev) {
    if (!tonePop.hidden && !ev.target.closest('.tone-pop')) hideTonePop();
  });

  /* ---------- search ---------- */
  searchInput.addEventListener('input', function () {
    query = searchInput.value.trim();
    clearBtn.hidden = !query;
    render();
  });
  clearBtn.addEventListener('click', function () {
    searchInput.value = '';
    query = '';
    clearBtn.hidden = true;
    render();
    searchInput.focus();
  });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (ev) {
    if (!tonePop.hidden && ev.key === 'Escape') { hideTonePop(); return; }
    if (ev.key === 'Escape') {
      if (query) {
        searchInput.value = ''; query = ''; clearBtn.hidden = true; render();
      } else {
        api.hide();
      }
      return;
    }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' ||
        ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      if (!items.length) return;
      ev.preventDefault();
      if (hi < 0) { setHi(ev.key === 'ArrowUp' ? items.length - 1 : 0); return; }
      var n = hi;
      if (ev.key === 'ArrowRight') n = (hi + 1) % items.length;
      if (ev.key === 'ArrowLeft') n = (hi - 1 + items.length) % items.length;
      if (ev.key === 'ArrowDown') n = Math.min(hi + COLS, items.length - 1);
      if (ev.key === 'ArrowUp') n = Math.max(hi - COLS, 0);
      setHi(n);
      return;
    }
    if (ev.key === 'Enter') {
      if (hi >= 0 && items[hi]) { ev.preventDefault(); doInsert(items[hi]); }
      return;
    }
    // printable char while search not focused -> focus search
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey &&
        document.activeElement !== searchInput) {
      searchInput.focus();
    }
  });
  // mouse hover clears keyboard highlight
  gridInner.addEventListener('pointermove', function (ev) {
    var cell = ev.target.closest('.cell');
    if (cell && hi >= 0) {
      var cells = gridInner.children;
      if (cells[hi]) cells[hi].classList.remove('kb');
      hi = -1;
    }
  });

  /* ---------- show (called from Python) ---------- */
  window.onPickerShow = function () {
    hideTonePop();
    cat = lastCat;
    searchInput.value = '';
    query = '';
    clearBtn.hidden = true;
    renderCatbar();
    render();
    setTimeout(function () { searchInput.focus(); }, 30);
  };

  /* ---------- init (once the pywebview bridge is ready) ---------- */
  var _inited = false;
  function init() {
    if (_inited) return;
    _inited = true;
    renderCatbar();
    render();
    api.getConfig().then(function (cfg) {
      if (cfg && cfg.accent) {
        document.documentElement.style.setProperty('--accent', cfg.accent);
        var m = cfg.accent.match(/^#([0-9a-f]{6})$/i);
        if (m) {
          var r = parseInt(m[1].substr(0, 2), 16),
              g = parseInt(m[1].substr(2, 2), 16),
              b = parseInt(m[1].substr(4, 2), 16);
          document.documentElement.style.setProperty('--accent-soft', 'rgba(' + r + ',' + g + ',' + b + ',0.18)');
          document.documentElement.style.setProperty('--accent-pressed', 'rgba(' + r + ',' + g + ',' + b + ',0.28)');
        }
      }
      if (cfg && cfg.lastCategory !== undefined) lastCat = cfg.lastCategory;
      cat = lastCat;
      renderCatbar();
      render();
    });
    api.getRecents().then(function (r) {
      if (r && r.length) { recents = r; render(); }
    });
  }
  function boot() { bindApi(); init(); }
  if (window.addEventListener) window.addEventListener('pywebviewready', boot);
  if (bindApi()) { init(); }
  else { setTimeout(boot, 600); }  /* plain-browser fallback: keep MOCK */
})();
