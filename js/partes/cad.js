// PIPING · parte «cad»: se carga al usarla (la genera el empaquetado a partir de piping.js)
const PLANTILLA_DXF = {"cabecera": "  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1015\n  9\n$ACADMAINTVER\n 70\n6\n  9\n$DWGCODEPAGE\n  3\nANSI_1252\n  9\n$INSBASE\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$EXTMIN\n 10\n1e+20\n 20\n1e+20\n 30\n1e+20\n  9\n$EXTMAX\n 10\n-1e+20\n 20\n-1e+20\n 30\n-1e+20\n  9\n$LIMMIN\n 10\n0.0\n 20\n0.0\n  9\n$LIMMAX\n 10\n420.0\n 20\n297.0\n  9\n$ORTHOMODE\n 70\n0\n  9\n$REGENMODE\n 70\n1\n  9\n$FILLMODE\n 70\n1\n  9\n$QTEXTMODE\n 70\n0\n  9\n$MIRRTEXT\n 70\n1\n  9\n$LTSCALE\n 40\n1.0\n  9\n$ATTMODE\n 70\n1\n  9\n$TEXTSIZE\n 40\n2.5\n  9\n$TRACEWID\n 40\n1.0\n  9\n$TEXTSTYLE\n  7\nStandard\n  9\n$CLAYER\n  8\n0\n  9\n$CELTYPE\n  6\nByLayer\n  9\n$CECOLOR\n 62\n256\n  9\n$CELTSCALE\n 40\n1.0\n  9\n$DISPSILH\n 70\n0\n  9\n$DIMSCALE\n 40\n1.0\n  9\n$DIMASZ\n 40\n2.5\n  9\n$DIMEXO\n 40\n0.625\n  9\n$DIMDLI\n 40\n3.75\n  9\n$DIMRND\n 40\n0.0\n  9\n$DIMDLE\n 40\n0.0\n  9\n$DIMEXE\n 40\n1.25\n  9\n$DIMTP\n 40\n0.0\n  9\n$DIMTM\n 40\n0.0\n  9\n$DIMTXT\n 40\n2.5\n  9\n$DIMCEN\n 40\n2.5\n  9\n$DIMTSZ\n 40\n0.0\n  9\n$DIMTOL\n 70\n0\n  9\n$DIMLIM\n 70\n0\n  9\n$DIMTIH\n 70\n0\n  9\n$DIMTOH\n 70\n0\n  9\n$DIMSE1\n 70\n0\n  9\n$DIMSE2\n 70\n0\n  9\n$DIMTAD\n 70\n1\n  9\n$DIMZIN\n 70\n8\n  9\n$DIMBLK\n  1\n\n  9\n$DIMASO\n 70\n1\n  9\n$DIMSHO\n 70\n1\n  9\n$DIMPOST\n  1\n\n  9\n$DIMAPOST\n  1\n\n  9\n$DIMALT\n 70\n0\n  9\n$DIMALTD\n 70\n3\n  9\n$DIMALTF\n 40\n0.03937007874\n  9\n$DIMLFAC\n 40\n1.0\n  9\n$DIMTOFL\n 70\n1\n  9\n$DIMTVP\n 40\n0.0\n  9\n$DIMTIX\n 70\n0\n  9\n$DIMSOXD\n 70\n0\n  9\n$DIMSAH\n 70\n0\n  9\n$DIMBLK1\n  1\n\n  9\n$DIMBLK2\n  1\n\n  9\n$DIMSTYLE\n  2\nISO-25\n  9\n$DIMCLRD\n 70\n0\n  9\n$DIMCLRE\n 70\n0\n  9\n$DIMCLRT\n 70\n0\n  9\n$DIMTFAC\n 40\n1.0\n  9\n$DIMGAP\n 40\n0.625\n  9\n$DIMJUST\n 70\n0\n  9\n$DIMSD1\n 70\n0\n  9\n$DIMSD2\n 70\n0\n  9\n$DIMTOLJ\n 70\n0\n  9\n$DIMTZIN\n 70\n8\n  9\n$DIMALTZ\n 70\n0\n  9\n$DIMALTTZ\n 70\n0\n  9\n$DIMUPT\n 70\n0\n  9\n$DIMDEC\n 70\n2\n  9\n$DIMTDEC\n 70\n2\n  9\n$DIMALTU\n 70\n2\n  9\n$DIMALTTD\n 70\n3\n  9\n$DIMTXSTY\n  7\nStandard\n  9\n$DIMAUNIT\n 70\n0\n  9\n$DIMADEC\n 70\n0\n  9\n$DIMALTRND\n 40\n0.0\n  9\n$DIMAZIN\n 70\n0\n  9\n$DIMDSEP\n 70\n44\n  9\n$DIMATFIT\n 70\n3\n  9\n$DIMFRAC\n 70\n0\n  9\n$DIMLDRBLK\n  1\n\n  9\n$DIMLUNIT\n 70\n2\n  9\n$DIMLWD\n 70\n-2\n  9\n$DIMLWE\n 70\n-2\n  9\n$DIMTMOVE\n 70\n0\n  9\n$LUNITS\n 70\n2\n  9\n$LUPREC\n 70\n4\n  9\n$SKETCHINC\n 40\n1.0\n  9\n$FILLETRAD\n 40\n10.0\n  9\n$AUNITS\n 70\n0\n  9\n$AUPREC\n 70\n2\n  9\n$MENU\n  1\n.\n  9\n$ELEVATION\n 40\n0.0\n  9\n$PELEVATION\n 40\n0.0\n  9\n$THICKNESS\n 40\n0.0\n  9\n$LIMCHECK\n 70\n0\n  9\n$CHAMFERA\n 40\n0.0\n  9\n$CHAMFERB\n 40\n0.0\n  9\n$CHAMFERC\n 40\n0.0\n  9\n$CHAMFERD\n 40\n0.0\n  9\n$SKPOLY\n 70\n0\n  9\n$TDCREATE\n 40\n2461314.881064815\n  9\n$TDUCREATE\n 40\n2458532.153996898\n  9\n$TDUPDATE\n 40\n2461314.881076389\n  9\n$TDUUPDATE\n 40\n2458532.1544311\n  9\n$TDINDWG\n 40\n0.0\n  9\n$TDUSRTIMER\n 40\n0.0\n  9\n$USRTIMER\n 70\n1\n  9\n$ANGBASE\n 50\n0.0\n  9\n$ANGDIR\n 70\n0\n  9\n$PDMODE\n 70\n0\n  9\n$PDSIZE\n 40\n0.0\n  9\n$PLINEWID\n 40\n0.0\n  9\n$SPLFRAME\n 70\n0\n  9\n$SPLINETYPE\n 70\n6\n  9\n$SPLINESEGS\n 70\n8\n  9\n$HANDSEED\n  5\n49\n  9\n$SURFTAB1\n 70\n6\n  9\n$SURFTAB2\n 70\n6\n  9\n$SURFTYPE\n 70\n6\n  9\n$SURFU\n 70\n6\n  9\n$SURFV\n 70\n6\n  9\n$UCSBASE\n  2\n\n  9\n$UCSNAME\n  2\n\n  9\n$UCSORG\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSXDIR\n 10\n1.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSYDIR\n 10\n0.0\n 20\n1.0\n 30\n0.0\n  9\n$UCSORTHOREF\n  2\n\n  9\n$UCSORTHOVIEW\n 70\n0\n  9\n$UCSORGTOP\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGBOTTOM\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGLEFT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGRIGHT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGFRONT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGBACK\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSBASE\n  2\n\n  9\n$PUCSNAME\n  2\n\n  9\n$PUCSORG\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSXDIR\n 10\n1.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSYDIR\n 10\n0.0\n 20\n1.0\n 30\n0.0\n  9\n$PUCSORTHOREF\n  2\n\n  9\n$PUCSORTHOVIEW\n 70\n0\n  9\n$PUCSORGTOP\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGBOTTOM\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGLEFT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGRIGHT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGFRONT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGBACK\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$USERI1\n 70\n0\n  9\n$USERI2\n 70\n0\n  9\n$USERI3\n 70\n0\n  9\n$USERI4\n 70\n0\n  9\n$USERI5\n 70\n0\n  9\n$USERR1\n 40\n0.0\n  9\n$USERR2\n 40\n0.0\n  9\n$USERR3\n 40\n0.0\n  9\n$USERR4\n 40\n0.0\n  9\n$USERR5\n 40\n0.0\n  9\n$WORLDVIEW\n 70\n1\n  9\n$SHADEDGE\n 70\n3\n  9\n$SHADEDIF\n 70\n70\n  9\n$TILEMODE\n 70\n1\n  9\n$MAXACTVP\n 70\n64\n  9\n$PINSBASE\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PLIMCHECK\n 70\n0\n  9\n$PEXTMIN\n 10\n1e+20\n 20\n1e+20\n 30\n1e+20\n  9\n$PEXTMAX\n 10\n-1e+20\n 20\n-1e+20\n 30\n-1e+20\n  9\n$PLIMMIN\n 10\n0.0\n 20\n0.0\n  9\n$PLIMMAX\n 10\n420.0\n 20\n297.0\n  9\n$UNITMODE\n 70\n0\n  9\n$VISRETAIN\n 70\n1\n  9\n$PLINEGEN\n 70\n0\n  9\n$PSLTSCALE\n 70\n1\n  9\n$TREEDEPTH\n 70\n3020\n  9\n$CMLSTYLE\n  2\nStandard\n  9\n$CMLJUST\n 70\n0\n  9\n$CMLSCALE\n 40\n20.0\n  9\n$PROXYGRAPHICS\n 70\n1\n  9\n$MEASUREMENT\n 70\n1\n  9\n$CELWEIGHT\n370\n-1\n  9\n$ENDCAPS\n280\n0\n  9\n$JOINSTYLE\n280\n0\n  9\n$LWDISPLAY\n290\n1\n  9\n$INSUNITS\n 70\n4\n  9\n$HYPERLINKBASE\n  1\n\n  9\n$STYLESHEET\n  1\n\n  9\n$XEDIT\n290\n1\n  9\n$CEPSNTYPE\n380\n0\n  9\n$PSTYLEMODE\n290\n1\n  9\n$FINGERPRINTGUID\n  2\n{FBFB092F-0CF3-480D-934B-1C92452910B4}\n  9\n$VERSIONGUID\n  2\n{7DE2908E-E822-435E-BA22-2DDEBDC4722E}\n  9\n$EXTNAMES\n290\n1\n  9\n$PSVPSCALE\n 40\n0.0\n  9\n$OLESTARTUP\n290\n0\n  0\nENDSEC\n  0\nSECTION\n  2\nCLASSES\n  0\nCLASS\n  1\nACDBDICTIONARYWDFLT\n  2\nAcDbDictionaryWithDefault\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nSUN\n  2\nAcDbSun\n  3\nSCENEOE\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nVISUALSTYLE\n  2\nAcDbVisualStyle\n  3\nObjectDBX Classes\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nMATERIAL\n  2\nAcDbMaterial\n  3\nObjectDBX Classes\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nSCALE\n  2\nAcDbScale\n  3\nObjectDBX Classes\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nTABLESTYLE\n  2\nAcDbTableStyle\n  3\nObjectDBX Classes\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nMLEADERSTYLE\n  2\nAcDbMLeaderStyle\n  3\nACDB_MLEADERSTYLE_CLASS\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nDICTIONARYVAR\n  2\nAcDbDictionaryVar\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nCELLSTYLEMAP\n  2\nAcDbCellStyleMap\n  3\nObjectDBX Classes\n 90\n1152\n280\n0\n281\n0\n  0\nCLASS\n  1\nMENTALRAYRENDERSETTINGS\n  2\nAcDbMentalRayRenderSettings\n  3\nSCENEOE\n 90\n1024\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBDETAILVIEWSTYLE\n  2\nAcDbDetailViewStyle\n  3\nObjectDBX Classes\n 90\n1025\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBSECTIONVIEWSTYLE\n  2\nAcDbSectionViewStyle\n  3\nObjectDBX Classes\n 90\n1025\n280\n0\n281\n0\n  0\nCLASS\n  1\nRASTERVARIABLES\n  2\nAcDbRasterVariables\n  3\nISM\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBPLACEHOLDER\n  2\nAcDbPlaceHolder\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nLAYOUT\n  2\nAcDbLayout\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nENDSEC\n  0\nSECTION\n  2\nTABLES\n  0\nTABLE\n  2\nVPORT\n  5\n8\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n  0\nVPORT\n  5\n23\n330\n8\n100\nAcDbSymbolTableRecord\n100\nAcDbViewportTableRecord\n  2\n*Active\n 70\n0\n 10\n0.0\n 20\n0.0\n 11\n1.0\n 21\n1.0\n 12\n0.0\n 22\n0.0\n 13\n0.0\n 23\n0.0\n 14\n0.5\n 24\n0.5\n 15\n0.5\n 25\n0.5\n 16\n0.0\n 26\n0.0\n 36\n1.0\n 17\n0.0\n 27\n0.0\n 37\n0.0\n 40\n1000.0\n 41\n1.34\n 42\n50.0\n 43\n0.0\n 44\n0.0\n 50\n0.0\n 51\n0.0\n 71\n0\n 72\n1000\n 73\n1\n 74\n3\n 75\n0\n 76\n0\n 77\n0\n 78\n0\n281\n0\n 65\n0\n146\n0.0\n  0\nENDTAB\n  0\nTABLE\n  2\nLTYPE\n  5\n2\n330\n0\n100\nAcDbSymbolTable\n 70\n18\n  0\nLTYPE\n  5\n24\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nByBlock\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n25\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nByLayer\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n26\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nContinuous\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n2F\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nCadena\n 70\n0\n  3\nCadena __ __ \n 72\n65\n 73\n4\n 40\n21.0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n3.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n30\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nContinuo\n 70\n0\n  3\nContinuo ________\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n31\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nDoble trazado y doble punto\n 70\n0\n  3\nDoble trazado y doble punto __ __ . . \n 72\n65\n 73\n8\n 40\n36.0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n32\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nDoble trazado y triple punto\n 70\n0\n  3\nDoble trazado y triple punto __ __ . . . \n 72\n65\n 73\n10\n 40\n39.0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n33\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nPunto\n 70\n0\n  3\nPunto . \n 72\n65\n 73\n2\n 40\n3.0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n34\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado\n 70\n0\n  3\nTrazado __ \n 72\n65\n 73\n2\n 40\n15.0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n35\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado doble y cadena\n 70\n0\n  3\nTrazado doble y cadena __ __ __ \n 72\n65\n 73\n6\n 40\n36.0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n3.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n36\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado doble y punto\n 70\n0\n  3\nTrazado doble y punto __ __ . \n 72\n65\n 73\n6\n 40\n33.0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n37\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado largo y doble punto\n 70\n0\n  3\nTrazado largo y doble punto __ . . \n 72\n65\n 73\n6\n 40\n33.0\n 49\n24.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n38\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado largo y punto\n 70\n0\n  3\nTrazado largo y punto __ . \n 72\n65\n 73\n4\n 40\n30.0\n 49\n24.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n39\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado largo y triple punto\n 70\n0\n  3\nTrazado largo y triple punto __ . . . \n 72\n65\n 73\n8\n 40\n36.0\n 49\n24.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n3A\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado y doble punto\n 70\n0\n  3\nTrazado y doble punto __ . . \n 72\n65\n 73\n6\n 40\n21.0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n3B\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado y espacio\n 70\n0\n  3\nTrazado y espacio __ \n 72\n65\n 73\n2\n 40\n18.0\n 49\n12.0\n 74\n0\n 49\n-6.0\n 74\n0\n  0\nLTYPE\n  5\n3C\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado y punto\n 70\n0\n  3\nTrazado y punto __ . \n 72\n65\n 73\n4\n 40\n30.5\n 49\n24.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.5\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nLTYPE\n  5\n3D\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nTrazado y triple punto\n 70\n0\n  3\nTrazado y triple punto __ . . . \n 72\n65\n 73\n8\n 40\n24.0\n 49\n12.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n 49\n0.0\n 74\n0\n 49\n-3.0\n 74\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nLAYER\n  5\n1\n330\n0\n100\nAcDbSymbolTable\n 70\n10\n  0\nLAYER\n  5\n27\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n0\n 70\n0\n 62\n7\n  6\nContinuous\n370\n20\n390\n13\n  0\nLAYER\n  5\n28\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDefpoints\n 70\n0\n 62\n7\n  6\nContinuous\n290\n0\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3E\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nBord\n 70\n0\n 62\n2\n  6\nContinuous\n370\n70\n390\n13\n  0\nLAYER\n  5\n3F\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDim\n 70\n0\n 62\n6\n  6\nContinuous\n370\n30\n390\n13\n  0\nLAYER\n  5\n40\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nHid\n 70\n0\n 62\n1\n  6\nTrazado\n370\n20\n390\n13\n  0\nLAYER\n  5\n41\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nHidden\n 70\n0\n 62\n5\n  6\nTrazado y punto\n370\n25\n390\n13\n  0\nLAYER\n  5\n42\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nMarca\n 70\n0\n 62\n7\n  6\nContinuous\n370\n35\n390\n13\n  0\nLAYER\n  5\n43\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nObject\n 70\n0\n 62\n7\n  6\nContinuous\n370\n35\n390\n13\n  0\nLAYER\n  5\n44\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nText\n 70\n0\n 62\n3\n  6\nContinuous\n370\n35\n390\n13\n  0\nLAYER\n  5\n45\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nTratt\n 70\n0\n 62\n5\n  6\nContinuous\n370\n15\n390\n13\n  0\nENDTAB\n  0\nTABLE\n  2\nSTYLE\n  5\n5\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n  0\nSTYLE\n  5\n29\n330\n5\n100\nAcDbSymbolTableRecord\n100\nAcDbTextStyleTableRecord\n  2\nStandard\n 70\n0\n 40\n0.0\n 41\n1.0\n 50\n0.0\n 71\n0\n 42\n2.5\n  3\ntxt\n  4\n\n  0\nENDTAB\n  0\nTABLE\n  2\nVIEW\n  5\n7\n330\n0\n100\nAcDbSymbolTable\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nUCS\n  5\n6\n330\n0\n100\nAcDbSymbolTable\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nAPPID\n  5\n3\n330\n0\n100\nAcDbSymbolTable\n 70\n3\n  0\nAPPID\n  5\n2A\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nACAD\n 70\n0\n  0\nAPPID\n  5\n46\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nHATCHBACKGROUNDCOLOR\n 70\n0\n  0\nAPPID\n  5\n47\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nEZDXF\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nDIMSTYLE\n  5\n4\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n100\nAcDbDimStyleTable\n  0\nDIMSTYLE\n105\n2B\n330\n4\n100\nAcDbSymbolTableRecord\n100\nAcDbDimStyleTableRecord\n  2\nStandard\n 70\n0\n  3\n\n  4\n\n 40\n1.0\n 41\n2.5\n 42\n0.625\n 43\n3.75\n 44\n1.25\n 45\n0.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n140\n2.5\n141\n2.5\n142\n0.0\n143\n0.03937007874\n144\n1.0\n145\n0.0\n146\n1.0\n147\n0.625\n148\n0.0\n 71\n0\n 72\n0\n 73\n0\n 74\n0\n 75\n0\n 76\n0\n 77\n1\n 78\n8\n 79\n3\n170\n0\n171\n3\n172\n1\n173\n0\n174\n0\n175\n0\n176\n0\n177\n0\n178\n0\n179\n2\n271\n2\n272\n2\n273\n2\n274\n3\n275\n0\n276\n0\n277\n2\n278\n44\n279\n0\n280\n0\n281\n0\n282\n0\n283\n0\n284\n8\n285\n0\n286\n0\n288\n0\n289\n3\n371\n-2\n372\n-2\n  0\nENDTAB\n  0\nTABLE\n  2\nBLOCK_RECORD\n  5\n9\n330\n0\n100\nAcDbSymbolTable\n 70\n2\n  0\nBLOCK_RECORD\n  5\n17\n330\n9\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n*Model_Space\n340\n1A\n  0\nBLOCK_RECORD\n  5\n1B\n330\n9\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n*Paper_Space\n340\n1E\n  0\nENDTAB\n  0\nENDSEC\n  0\nSECTION\n  2\nBLOCKS\n  0\nBLOCK\n  5\n18\n330\n17\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n*Model_Space\n 70\n0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n*Model_Space\n  1\n\n  0\nENDBLK\n  5\n19\n330\n17\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n  0\nBLOCK\n  5\n1C\n330\n1B\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n*Paper_Space\n 70\n0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n*Paper_Space\n  1\n\n  0\nENDBLK\n  5\n1D\n330\n1B\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n", "pie": "  0\nENDSEC\n  0\nSECTION\n  2\nOBJECTS\n  0\nDICTIONARY\n  5\nA\n330\n0\n100\nAcDbDictionary\n281\n1\n  3\nACAD_COLOR\n350\nB\n  3\nACAD_GROUP\n350\nC\n  3\nACAD_LAYOUT\n350\nD\n  3\nACAD_MATERIAL\n350\nE\n  3\nACAD_MLEADERSTYLE\n350\nF\n  3\nACAD_MLINESTYLE\n350\n10\n  3\nACAD_PLOTSETTINGS\n350\n11\n  3\nACAD_PLOTSTYLENAME\n350\n12\n  3\nACAD_SCALELIST\n350\n14\n  3\nACAD_TABLESTYLE\n350\n15\n  3\nACAD_VISUALSTYLE\n350\n16\n  3\nEZDXF_META\n350\n2D\n  0\nDICTIONARY\n  5\nB\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\nC\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\nD\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nModel\n350\n1A\n  3\nLayout1\n350\n1E\n  0\nDICTIONARY\n  5\nE\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nByBlock\n350\n1F\n  3\nByLayer\n350\n20\n  3\nGlobal\n350\n21\n  0\nDICTIONARY\n  5\nF\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n2C\n  0\nDICTIONARY\n  5\n10\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n22\n  0\nDICTIONARY\n  5\n11\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nACDBDICTIONARYWDFLT\n  5\n12\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nNormal\n350\n13\n100\nAcDbDictionaryWithDefault\n340\n13\n  0\nACDBPLACEHOLDER\n  5\n13\n330\n12\n  0\nDICTIONARY\n  5\n14\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\n15\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\n16\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nLAYOUT\n  5\n1A\n330\nD\n100\nAcDbPlotSettings\n  1\n\n  4\nA3\n  6\n\n 40\n7.5\n 41\n20.0\n 42\n7.5\n 43\n20.0\n 44\n420.0\n 45\n297.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n0.0\n140\n0.0\n141\n0.0\n142\n1.0\n143\n1.0\n 70\n1024\n 72\n1\n 73\n0\n 74\n5\n  7\n\n 75\n16\n 76\n0\n 77\n2\n 78\n300\n147\n1.0\n148\n0.0\n149\n0.0\n100\nAcDbLayout\n  1\nModel\n 70\n1\n 71\n0\n 10\n0.0\n 20\n0.0\n 11\n420.0\n 21\n297.0\n 12\n0.0\n 22\n0.0\n 32\n0.0\n 14\n1e+20\n 24\n1e+20\n 34\n1e+20\n 15\n-1e+20\n 25\n-1e+20\n 35\n-1e+20\n146\n0.0\n 13\n0.0\n 23\n0.0\n 33\n0.0\n 16\n1.0\n 26\n0.0\n 36\n0.0\n 17\n0.0\n 27\n1.0\n 37\n0.0\n 76\n1\n330\n17\n  0\nLAYOUT\n  5\n1E\n330\nD\n100\nAcDbPlotSettings\n  1\n\n  4\nA3\n  6\n\n 40\n7.5\n 41\n20.0\n 42\n7.5\n 43\n20.0\n 44\n420.0\n 45\n297.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n0.0\n140\n0.0\n141\n0.0\n142\n1.0\n143\n1.0\n 70\n0\n 72\n1\n 73\n0\n 74\n5\n  7\n\n 75\n16\n 76\n0\n 77\n2\n 78\n300\n147\n1.0\n148\n0.0\n149\n0.0\n100\nAcDbLayout\n  1\nLayout1\n 70\n1\n 71\n1\n 10\n0.0\n 20\n0.0\n 11\n420.0\n 21\n297.0\n 12\n0.0\n 22\n0.0\n 32\n0.0\n 14\n1e+20\n 24\n1e+20\n 34\n1e+20\n 15\n-1e+20\n 25\n-1e+20\n 35\n-1e+20\n146\n0.0\n 13\n0.0\n 23\n0.0\n 33\n0.0\n 16\n1.0\n 26\n0.0\n 36\n0.0\n 17\n0.0\n 27\n1.0\n 37\n0.0\n 76\n1\n330\n1B\n  0\nMATERIAL\n  5\n1F\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nByBlock\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMATERIAL\n  5\n20\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nByLayer\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMATERIAL\n  5\n21\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nGlobal\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMLINESTYLE\n  5\n22\n102\n{ACAD_REACTORS\n330\n10\n102\n}\n330\n10\n100\nAcDbMlineStyle\n  2\nStandard\n 70\n0\n  3\n\n 62\n256\n 51\n90.0\n 52\n90.0\n 71\n2\n 49\n0.5\n 62\n256\n  6\nBYLAYER\n 49\n-0.5\n 62\n256\n  6\nBYLAYER\n  0\nMLEADERSTYLE\n  5\n2C\n102\n{ACAD_REACTORS\n330\nF\n102\n}\n330\nF\n100\nAcDbMLeaderStyle\n179\n2\n170\n2\n171\n1\n172\n0\n 90\n2\n 40\n0.0\n 41\n0.0\n173\n1\n 91\n-1056964608\n 92\n-2\n290\n1\n 42\n2.0\n291\n1\n 43\n8.0\n  3\nStandard\n 44\n4.0\n300\n\n342\n29\n174\n1\n175\n1\n176\n0\n178\n1\n 93\n-1056964608\n 45\n4.0\n292\n0\n297\n0\n 46\n4.0\n 94\n-1056964608\n 47\n1.0\n 49\n1.0\n140\n1.0\n294\n1\n141\n0.0\n177\n0\n142\n1.0\n295\n0\n296\n0\n143\n3.75\n271\n0\n272\n9\n273\n9\n  0\nDICTIONARY\n  5\n2D\n330\nA\n100\nAcDbDictionary\n280\n1\n281\n1\n  3\nCREATED_BY_EZDXF\n350\n2E\n  3\nWRITTEN_BY_EZDXF\n350\n48\n  0\nDICTIONARYVAR\n  5\n2E\n330\n2D\n100\nDictionaryVariables\n280\n0\n  1\n1.4.4 @ 2026-09-30T19:08:44.999086+00:00\n  0\nDICTIONARYVAR\n  5\n48\n330\n2D\n100\nDictionaryVariables\n280\n0\n  1\n1.4.4 @ 2026-09-30T19:08:45.000733+00:00\n  0\nENDSEC\n  0\nEOF\n", "modelo": "17", "seed": "49"};
function exportarDXF__p() {
            renderizarVectorial();
            const FMT = formatoActual(), S = FMT.w / ANCHO_A3; // mm de papel por unidad de dibujo
            const out = [];
            let h = parseInt(PLANTILLA_DXF.seed, 16);
            const MS = PLANTILLA_DXF.modelo;
            const w = (...kv) => { for (let i = 0; i < kv.length; i += 2) out.push(String(kv[i]).padStart(3, ' '), String(kv[i + 1])); };
            const ent = (tipo, capa, sub) => { w(0, tipo, 5, (h++).toString(16).toUpperCase(), 330, MS, 100, 'AcDbEntity', 8, capa, 100, sub); };
            const P = (m, x, y) => { const px = m.a * x + m.c * y + m.e, py = m.b * x + m.d * y + m.f; return [+(px * S).toFixed(3), +((ALTO_A3 - py) * S).toFixed(3)]; };
            const polilinea = (capa, pts, cerrada) => {
                if (pts.length < 2) return;
                ent('LWPOLYLINE', capa, 'AcDbPolyline'); w(90, pts.length, 70, cerrada ? 1 : 0, 43, 0);
                pts.forEach(p => w(10, p[0], 20, p[1]));
            };
            // capaForma: capa de líneas y figuras; los textos van siempre a la capa Text
            const recorrer = (g, capaForma, propia) => {
                g.querySelectorAll('*').forEach(n => {
                    if (!propia && n.closest('[data-capa]')) return; // grupos con capa propia: se recorren aparte
                    if (n.classList.contains('connection-port') || n.classList.contains('punto-enganche') || n.closest('defs, pattern, .no-imprimir') || n.id === 'rejilla') return;
                    if (n.tagName.toLowerCase() === 'rect' && n.getAttribute('fill') === 'transparent') return;
                    const m = n.getCTM();
                    if (!m) return;
                    const tag = n.tagName.toLowerCase(), num = a => parseFloat(n.getAttribute(a)) || 0;
                    if (tag === 'line') { const a = P(m, num('x1'), num('y1')), b = P(m, num('x2'), num('y2')); ent('LINE', capaForma, 'AcDbLine'); w(10, a[0], 20, a[1], 30, 0, 11, b[0], 21, b[1], 31, 0); }
                    else if (tag === 'polygon' || tag === 'polyline') {
                        const pts = (n.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
                        const lista = []; for (let i = 0; i + 1 < pts.length; i += 2) lista.push(P(m, pts[i], pts[i + 1]));
                        polilinea(capaForma, lista, tag === 'polygon');
                    } else if (tag === 'rect') {
                        const x = num('x'), y = num('y'), W = num('width'), H = num('height');
                        polilinea(capaForma, [P(m, x, y), P(m, x + W, y), P(m, x + W, y + H), P(m, x, y + H)], true);
                    } else if (tag === 'circle') {
                        const c = P(m, num('cx'), num('cy')), r = num('r') * Math.hypot(m.a, m.b) * S;
                        ent('CIRCLE', capaForma, 'AcDbCircle'); w(10, c[0], 20, c[1], 30, 0, 40, +r.toFixed(3));
                    } else if (tag === 'ellipse' || tag === 'path') {
                        // curvas: se discretizan en 24 tramos
                        let lista = [];
                        if (tag === 'ellipse') { const cx = num('cx'), cy = num('cy'), rx = num('rx'), ry = num('ry'); for (let i = 0; i <= 24; i++) { const t = i / 24 * 2 * Math.PI; lista.push(P(m, cx + rx * Math.cos(t), cy + ry * Math.sin(t))); } }
                        else { const L = n.getTotalLength(); for (let i = 0; i <= 24; i++) { const q = n.getPointAtLength(L * i / 24); lista.push(P(m, q.x, q.y)); } }
                        polilinea(capaForma, lista, /z\s*$/i.test(n.getAttribute('d') || ''));
                    } else if (tag === 'text') {
                        const t = textoDXF(n.textContent); if (!t.trim()) return;
                        const p = P(m, num('x'), num('y')), hh = (parseFloat(n.getAttribute('font-size')) || 7) * Math.hypot(m.a, m.b) * S;
                        const ang = Math.atan2(-m.b, m.a) * 180 / Math.PI;
                        const anc = n.getAttribute('text-anchor') === 'middle' ? 1 : n.getAttribute('text-anchor') === 'end' ? 2 : 0;
                        ent('TEXT', propia ? capaForma : 'Text', 'AcDbText'); w(10, p[0], 20, p[1], 30, 0, 40, +hh.toFixed(3), 1, t, 50, +ang.toFixed(2), 72, anc);
                        if (anc) w(11, p[0], 21, p[1], 31, 0);
                        w(100, 'AcDbText');
                    }
                });
            };
            const gFmt = svgCanvas.querySelector('#capa-formato'); if (gFmt) recorrer(gFmt, 'Bord');
            svgCanvas.querySelectorAll('#capa-formato [data-capa]').forEach(g => recorrer(g, g.getAttribute('data-capa'), true));
            svgCanvas.querySelectorAll('g[data-id]').forEach(g => {
                const el = elementosRed.find(e => e.id === g.getAttribute('data-id'));
                if (!el) return;
                recorrer(g, capaDe(el));
            });
            ['#lideres-notas', '#capa-etiquetas'].forEach(sel => { const g = svgCanvas.querySelector(sel); if (g) recorrer(g, 'Object'); });
            let cab = tablaCapasDXF(PLANTILLA_DXF.cabecera, () => (h++).toString(16).toUpperCase())
                .replace(/(\$EXTMAX\r?\n\s*10\r?\n)[^\r\n]*(\r?\n\s*20\r?\n)[^\r\n]*/, `$1${FMT.w}$2${FMT.h}`)
                .replace(/(\$EXTMIN\r?\n\s*10\r?\n)[^\r\n]*(\r?\n\s*20\r?\n)[^\r\n]*/, '$10$20')
                .replace(/(\$LIMMAX\r?\n\s*10\r?\n)[^\r\n]*(\r?\n\s*20\r?\n)[^\r\n]*/, `$1${FMT.w}$2${FMT.h}`)
                .replace(/(\$HANDSEED\r?\n\s*5\r?\n)[^\r\n]*/, `$1${h.toString(16).toUpperCase()}`);
            return (cab + out.join('\n') + (out.length ? '\n' : '') + PLANTILLA_DXF.pie).replace(/\r?\n/g, '\r\n');
        }
function aciCercano(c) {
            let mejor = 7, dm = 1e9;
            for (let i = 1; i < 256; i++) { const q = ACI_RGB[i], d = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2; if (d < dm) { dm = d; mejor = i; } }
            return mejor;
        }
function tablaCapasDXF(cab, nuevoHandle) {
            const i = cab.indexOf('  0\nTABLE\n  2\nLAYER\n'); if (i < 0) return cab;
            const j = cab.indexOf('  0\nENDTAB\n', i), tabla = cab.slice(i, j);
            const k = tabla.indexOf('  0\nLAYER\n', 10), cabTabla = tabla.slice(0, k);
            const handles = {}, recs = tabla.slice(k).split(/(?=  0\nLAYER\n)/);
            let defpoints = '';
            recs.forEach(r => { const m = r.match(/\n  5\n([0-9A-Fa-f]+)\n[\s\S]*?\n  2\n([^\n]*)\n/); if (m) { handles[m[2]] = m[1]; if (m[2] === 'Defpoints') defpoints = r; } });
            const capas = capasActuales();
            let out = '';
            capas.forEach(c => {
                const h = handles[c.nombre] || nuevoHandle();
                const aci = aciCercano(c.color) * (c.visible === false ? -1 : 1);
                const flags = (c.inutilizada ? 1 : 0) | (c.bloqueada || planoCongelado ? 4 : 0);
                const lw = Math.round((+c.grosor || 0) * 100);
                out += `  0\nLAYER\n  5\n${h}\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n${textoDXF(c.nombre)}\n 70\n${flags}\n 62\n${aci}\n  6\n${tipoLineaDXF(c.tipo)}\n${c.imprimible === false ? '290\n0\n' : ''}370\n${lw}\n390\n13\n`;
            });
            const cabT = cabTabla.replace(/( 70\n)\d+\n$/, '$1' + (capas.length + 1) + '\n');
            return cab.slice(0, i) + cabT + out + defpoints + cab.slice(j);
        }
function ponerMarcaAgua() {
            quitarMarcaAgua(); const W = ANCHO_A3, H = ALTO_A3, fs = Math.min(W, H) / 11, t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('id', 'marca-agua'); t.setAttribute('x', (W / 2).toFixed(1)); t.setAttribute('y', (H / 2 + fs * 0.35).toFixed(1)); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-family', 'sans-serif');
            t.setAttribute('font-weight', 'bold'); t.setAttribute('font-size', fs.toFixed(1)); t.setAttribute('fill', '#9ca3af'); t.setAttribute('fill-opacity', '0.35'); t.setAttribute('pointer-events', 'none');
            t.setAttribute('transform', `rotate(-45 ${(W / 2).toFixed(1)} ${(H / 2).toFixed(1)})`); t.textContent = tradDoc(TEXTO_MARCA_AGUA);
            svgCanvas.insertBefore(t, svgCanvas.firstChild);
        }
function quitarMarcaAgua() { document.getElementById('marca-agua')?.remove(); }
function capturarHoja(i) {
            sincronizarHoja();
            const g = { e: elementosRed, l: lineas, cc: condicionesContorno, f: opciones.formato, h: hojaActual, c: planoCongelado, sel: idSeleccionado, s: new Set(seleccion), gu: guias };
            const h = hojas[i];
            try {
                hojaActual = i; elementosRed = h.e || []; lineas = h.l || []; condicionesContorno = h.cc || {}; opciones.formato = h.formato || g.f; idSeleccionado = null; seleccion.clear(); guias = [];   // las trayectorias guía no se imprimen
                aplicarFormato(); renderizarVectorial();
                document.querySelectorAll('.asa-tubo, #fantasma-mano, #pista-snap').forEach(x => x.remove());
                ponerMarcaAgua();
                const html = document.getElementById('marco-a3').outerHTML.replace('id="marco-a3"', 'class="hoja-impresa"');
                quitarMarcaAgua();
                return { html, formato: opciones.formato || 'A3' };
            } finally {
                hojaActual = g.h; elementosRed = g.e; lineas = g.l; condicionesContorno = g.cc; opciones.formato = g.f; idSeleccionado = g.sel; g.s.forEach(x => seleccion.add(x)); guias = g.gu;
                aplicarFormato(); renderizarVectorial();
            }
        }
function abrirImpresion__p() {
            cerrarMenus(); sincronizarHoja();
            if (!impresionSel || impresionSel.length !== hojas.length) impresionSel = hojas.map((h, i) => true);
            const caps = hojas.map((h, i) => capturarHoja(i));
            const mini = (c, i) => { const f = FORMATOS[c.formato] || FORMATOS.A3, W = 190, esc_ = W / (f.w * PX_MM), H = f.h * PX_MM * esc_;
                return `<label class="block border rounded p-1.5 cursor-pointer ${impresionSel[i] ? 'border-blue-500 bg-blue-50' : 'border-slate-200 opacity-60'}"><div class="flex items-center gap-1 mb-1"><input type="checkbox" ${impresionSel[i] ? 'checked' : ''} onchange="impresionSel[${i}] = this.checked; abrirImpresion()"><b>Hoja ${esc(hojas[i].id)}</b><span class="text-slate-400 ml-auto">${c.formato}</span></div>
                    <div style="width:${W}px;height:${H}px;overflow:hidden;background:#fff;border:1px solid #e2e8f0"><div style="transform:scale(${esc_});transform-origin:0 0;width:${f.w * PX_MM}px;height:${f.h * PX_MM}px;pointer-events:none">${c.html}</div></div></label>`; };
            const nSel = impresionSel.filter(Boolean).length, fmts = [...new Set(caps.filter((c, i) => impresionSel[i]).map(c => c.formato))];
            document.getElementById('red-content').innerHTML = `<p class="text-[11px] text-slate-500 mb-2">Marca las hojas a imprimir. En el cuadro de impresión elige «Guardar como PDF» para obtener un PDF con todas ellas (una página por hoja).${fmts.length > 1 ? ` <span class="text-amber-700">Hay hojas de formatos distintos (${fmts.join(', ')}): se imprimen en el formato de la primera; imprime por separado si lo necesitas.</span>` : ''}</p>
                <div class="flex flex-wrap gap-3 overflow-auto" style="max-height:62vh">${caps.map(mini).join('')}</div>`;
            document.getElementById('red-footer').innerHTML = `<div class="flex gap-2 w-full text-xs"><button onclick="impresionSel = hojas.map(() => true); abrirImpresion()" class="px-3 py-1.5 border rounded">Todas</button><button onclick="impresionSel = hojas.map((h, i) => i === hojaActual); abrirImpresion()" class="px-3 py-1.5 border rounded">Solo la actual</button><span class="flex-1"></span>
                <button onclick="cerrarModalRed()" class="px-3 py-1.5 border rounded">Cancelar</button><button onclick="exportarPDFCapas(hojas.map((h, i) => i), { marcaAgua: true })" title="Un PDF con todas las hojas, de la 00 a la última" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"><i class="fa-solid fa-file-pdf mr-1"></i>Imprimir todas (PDF, ${hojas.length} hoja${hojas.length === 1 ? '' : 's'})</button><button onclick="exportarPDFCapas(hojas.map((h, i) => i).filter(i => impresionSel[i]), { marcaAgua: true })" ${nSel ? '' : 'disabled'} class="px-3 py-1.5 border rounded disabled:opacity-40"><i class="fa-solid fa-file-pdf mr-1"></i>PDF vectorial con capas</button><button onclick="imprimirHojas()" ${nSel ? '' : 'disabled'} class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded font-medium"><i class="fa-solid fa-print mr-1"></i>Imprimir / PDF (${nSel} hoja${nSel === 1 ? '' : 's'})</button></div>`;
            document.querySelector('#modal-red h3 span').innerHTML = '<i class="fa-solid fa-print text-blue-600 mr-1.5"></i> Vista previa de impresión';
            document.querySelector('#modal-red > div').style.width = 'min(1200px, 97vw)';
            document.getElementById('modal-red').style.display = 'flex';
        }
function imprimirHojas__p() {
            const idx = hojas.map((h, i) => i).filter(i => impresionSel[i]).sort((a, b) => (parseInt(hojas[a].id, 10) || 0) - (parseInt(hojas[b].id, 10) || 0)); if (!idx.length) return;
            const caps = idx.map(i => capturarHoja(i)), f = FORMATOS[caps[0].formato] || FORMATOS.A3;
            cerrarModalRed();
            let cont = document.getElementById('impresion-multiple'); if (cont) cont.remove();
            cont = document.createElement('div'); cont.id = 'impresion-multiple';
            cont.innerHTML = caps.map(c => `<div class="pagina-impresa" style="width:${f.w}mm;height:${f.h}mm">${c.html}</div>`).join('');
            document.body.appendChild(cont);
            const st = document.createElement('style'); st.id = 'estilo-imp-multiple';
            st.textContent = `@media print { @page { size: ${caps[0].formato} ${f.w < f.h ? 'portrait' : 'landscape'}; margin: 0; } body.imp-multi #marco-a3 { display: none !important; } body.imp-multi #impresion-multiple, body.imp-multi #impresion-multiple * { visibility: visible !important; } body.imp-multi #impresion-multiple { position: absolute; left: 0; top: 0; } .pagina-impresa { page-break-after: always; break-after: page; overflow: hidden; position: relative; } .pagina-impresa:last-child { page-break-after: auto; break-after: auto; } .pagina-impresa .hoja-impresa { width: ${f.w}mm !important; height: ${f.h}mm !important; transform: none !important; box-shadow: none !important; background-image: none !important; } .pagina-impresa .connection-port, .pagina-impresa .punto-enganche { display: none !important; } } #impresion-multiple { display: none; } @media print { body.imp-multi #impresion-multiple { display: block; } }`;
            document.head.appendChild(st); document.body.classList.add('imp-multi');
            const fin = () => { document.body.classList.remove('imp-multi'); cont.remove(); st.remove(); window.removeEventListener('afterprint', fin); };
            window.addEventListener('afterprint', fin);
            setTimeout(() => { window.print(); setTimeout(() => { if (document.body.classList.contains('imp-multi') && !window.matchMedia('print').matches) fin(); }, 1500); }, 50);
        }
function geometriaIsometrico(idLinea) {
            const vec = mapaVecinos(); let orden = ordenarLinea(idLinea, vec).map(id => elementosRed.find(e => e.id === id)).filter(e => e && !esAnotacion(e));
            if (orden.length > 1) orden = orden.filter(e => (vec[e.id] || []).length);
            if (!orden.length) return null;
            const ids = new Set(orden.map(e => e.id)), g = geometria3DParaIso(el => ids.has(el.id), orden), d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
            g.segs.forEach((sg, i) => { const prev = g.segs[i - 1]; if (prev && d(prev.b, sg.a) > d(prev.b, sg.b) + 1e-6) { const t = sg.a; sg.a = sg.b; sg.b = t; } });
            const segs = g.segs.map(sg => ({ a: sg.a, b: sg.b, L: sg.L, tag: tagDe(sg.el), el: sg.el }));
            const marcas = g.comps.map(c => ({ p: c.C, tag: tagDe(c.el), tipo: c.el.type, sub: c.el.subtype, ramal: c.ports.length > 2 }));
            return { orden, segs, marcas };
        }
async function isometricoLinea__p(idLinea) {
            cerrarMenus();
            if (!idLinea) {
                if (!lineas.length) { aviso('No hay líneas en la hoja.', 'error'); return; }
                const sel = idSeleccionado && elementosRed.find(e => e.id === idSeleccionado);
                const r = await dialogo('<i class="fa-solid fa-cube text-blue-600 mr-1.5"></i>Isométrico de línea', `<p>Línea: <select id="iso-linea" class="border rounded p-1">${lineas.map(l => `<option value="${l.id}" ${sel && sel.linea === l.id ? 'selected' : ''}>${esc(l.id + (l.nombre ? ' · ' + l.nombre : ''))}</option>`).join('')}</select></p><p class="text-[10px] text-slate-400 mt-1">Se dibuja en una hoja nueva a partir de la longitud y las cotas a / b de cada tubería; la dirección en planta es la del esquema (derecha = este, arriba = norte).</p>`,
                    [{ texto: 'Crear isométrico', valor: 'si', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }, { texto: 'Cancelar', valor: null }]);
                if (r !== 'si') return; idLinea = document.getElementById('iso-linea').value;
            }
            const g = geometriaIsometrico(idLinea);
            if (!g || !g.segs.length) { aviso(`La línea ${idLinea} no tiene tuberías conectadas.`, 'error'); return; }
            const l = lineaPorId(idLinea), t0 = g.segs[0].el;
            const pts = g.segs.flatMap(s => [isoProy(s.a), isoProy(s.b)]);
            const u0 = Math.min(...pts.map(p => p.u)), u1 = Math.max(...pts.map(p => p.u)), v0 = Math.min(...pts.map(p => p.v)), v1 = Math.max(...pts.map(p => p.v));
            const hojaOrigen = codigoHoja();
            anadirHoja();
            const W = ANCHO_A3 - MM(60) - (opciones.ocultarLeyenda ? 0 : MM(80)), H = ALTO_A3 - MM(95), k = Math.min(W / Math.max(u1 - u0, 1e-6), H / Math.max(v1 - v0, 1e-6), MM(60));   // v8.52 · hueco a la derecha para la leyenda
            const X = p => +((isoProy(p).u - u0) * k).toFixed(2), Y = p => +((isoProy(p).v - v0) * k).toFixed(2);
            const zTxt = z => 'EL ' + (z >= 0 ? '+' : '') + (+z).toFixed(2).replace('.', decimalDoc());
            const geo = { segs: g.segs.map(s => ({ x1: X(s.a), y1: Y(s.a), x2: X(s.b), y2: Y(s.b), L: Math.round(s.L), tag: s.tag, za: s.a.z, zb: s.b.z })),
                marcas: g.marcas.map(m => ({ x: X(m.p), y: Y(m.p), tag: m.tag, tipo: m.tipo, sub: m.sub, ramal: m.ramal })), titulo: `${idLinea}${l && l.nombre ? ' · ' + l.nombre : ''}`,
                sub: `${tamanoTexto(t0)}" ${CODIGO_MATERIAL[t0.material] || t0.material} ${serieTexto(t0)} · ${hojaOrigen}`, w: +((u1 - u0) * k).toFixed(1), h: +((v1 - v0) * k).toFixed(1) };
            // cotas de elevación en el inicio, el final y cada cambio de nivel
            geo.cotas = []; let zUlt = null;
            const ponerCota = p => { geo.cotas.push({ x: X(p), y: Y(p), t: zTxt(p.zc) }); zUlt = p.zc; };
            g.segs.forEach((s, i) => { if (i === 0) ponerCota(s.a); if (Math.abs(s.b.zc - s.a.zc) > 1e-3) { if (zUlt == null || Math.abs(zUlt - s.a.zc) > 1e-3) ponerCota(s.a); ponerCota(s.b); } else if (i === g.segs.length - 1 && Math.abs(zUlt - s.b.zc) > 1e-3) ponerCota(s.b); });
            if (g.segs.length > 1 && geo.cotas.length < 2) ponerCota(g.segs[g.segs.length - 1].b);
            const n = nuevaAnotacion('isometrico', MM(30), MM(30) + Math.max(0, (H - geo.h) / 2));
            n.iso = geo; n.linea = undefined; n.x = MM(30) + Math.max(0, (W - geo.w) / 2);
            renderizarVectorial(); marcarCambios(true);
            const r = await dialogo('<i class="fa-solid fa-cube text-blue-600 mr-1.5"></i>Isométrico creado', `<p>Isométrico de la línea <b>${esc(idLinea)}</b> (${g.segs.length} tuberías, ${g.marcas.length} componentes) en la hoja <b>${esc(codigoHoja())}</b>.</p><p class="text-[11px] text-slate-500 mt-1">Se imprime con la hoja y se exporta con Archivo > Guardar como > Dibujo CAD (*.dxf).</p>`,
                [{ texto: 'Exportar a DXF', valor: 'dxf', clase: 'bg-blue-600 hover:bg-blue-700 text-white' }, { texto: 'Cerrar', valor: null }]);
            if (r === 'dxf') guardarComoProyecto('dxf');
        }
function importarLineasEquipos__p() {
            cerrarMenus();
            const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls';
            input.onchange = async ev => { const f = ev.target.files[0]; if (!f) return; try { const X = await cargarXLSX(); generarEsquemaExcel(X.read(await f.arrayBuffer(), { type: 'array' }), X); } catch (e) { console.error(e); alert('No se ha podido importar: ' + e.message); } };
            input.click();
        }
function generarEsquemaExcel(wb, X) {
            const hoja = re => { const n = wb.SheetNames.find(s => re.test(s)); return n ? X.utils.sheet_to_json(wb.Sheets[n], { defval: '' }) : []; };
            const col = (r, ...ns) => { const k = Object.keys(r).find(k => ns.some(n => k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').startsWith(n))); return k != null ? r[k] : ''; };
            const filasEq = hoja(/^equip/i), filasLi = hoja(/^l[ií]ne/i);
            if (!filasLi.length) throw new Error('No se ha encontrado la hoja «Líneas» (o está vacía).');
            guardarEstado(); invalidarResultados(); document.getElementById('empty-state')?.remove();
            const avisos = [], equipos = {}, nuevos = [];
            const yIni = elementosRed.length ? Math.min(...elementosRed.map(e => e.y)) - 140 : ALTO_A3 - MM(40);
            let y = yIni;
            filasEq.forEach(r => { const tag = String(col(r, 'tag')).trim(); if (!tag) return; const sub = tipoDesdeTexto(col(r, 'tipo')); if (!sub) { avisos.push(`Equipo ${tag}: tipo «${col(r, 'tipo')}» desconocido.`); return; } equipos[tag] = { sub, nombre: String(col(r, 'nombre')).trim(), cota: +col(r, 'cota') || 0, el: null }; });
            const colocar = (el, prev, puerto) => { if (!prev) return; const [, pb] = puerto ? [null, puerto] : puertoEntradaSalida(prev), [pa] = puertoEntradaSalida(el); el.x += pb.x - pa.x; el.y -= (pb.y - pa.y); };
            const anadir = (el, linea) => { if (linea) el.linea = linea; elementosRed.push(el); asignarNumero(el); nuevos.push(el); return el; };
            const crearEquipo = (tag, x, yy, linea) => { const q = equipos[tag]; const el = elementoDeTipo(q.sub, x, yy, { name: q.nombre || tag, cota: q.cota }); el.tagExterno = tag; q.el = anadir(el, linea); return el; };
            let nL = 0, nT = 0;
            filasLi.forEach((r, i) => {
                const id = String(col(r, 'linea')).trim(); if (!id) return;
                if (!lineaPorId(id)) lineas.push({ id, tipo: /^R/i.test(id) ? 'ramal' : 'principal', nombre: String(col(r, 'nombre')).trim(), padre: /^R/i.test(id) ? (lineas.find(l => l.tipo === 'principal') || {}).id : undefined, desde: null });
                const desde = String(col(r, 'desde')).trim(), hasta = String(col(r, 'hasta')).trim();
                const mat = String(col(r, 'material')).trim() || MATERIAL_DEF, ser = String(col(r, 'serie')).trim(), dn = String(col(r, 'dn')).trim() || 'DN 50';
                const L = +col(r, 'longitud') || 3000, za = +col(r, 'cota a') || 0, zb = +col(r, 'cota b') || 0;
                const comps = String(col(r, 'componentes')).split(/[;,]/).map(s => s.trim()).filter(Boolean);
                if (!CAT.materiales[mat]) avisos.push(`${id}: material «${mat}» desconocido; se usa ${MATERIAL_DEF}.`);
                let prev = null, x0 = MM(30), puertoIni = null;
                if (desde && equipos[desde]) { prev = equipos[desde].el || crearEquipo(desde, x0, y, id); }
                else if (desde) avisos.push(`${id}: el equipo de origen «${desde}» no está en la hoja Equipos.`);
                // tramos: la longitud se reparte entre los tramos que separan los componentes
                const nTramos = comps.length + 1, Lt = Math.max(100, Math.round(L / nTramos));
                const tubo = (k) => { const z0 = za + (zb - za) * k / nTramos, z1 = za + (zb - za) * (k + 1) / nTramos;
                    const t = elementoDeTipoTubo(mat, ser, dn, Lt, z0, z1); if (Math.abs(z1 - z0) > Lt / 1000) { t.cotaB = t.cotaA; }
                    if (!prev) { t.x = x0; t.y = y; t.inicioLinea = true; } else colocar(t, prev, puertoLibreSalida(prev));
                    anadir(t, id); prev = t; nT++; };
                tubo(0);
                comps.forEach((c, k) => {
                    const sub = tipoDesdeTexto(c); if (!sub) { avisos.push(`${id}: componente «${c}» desconocido.`); return; }
                    const el = elementoDeTipo(sub, 0, 0, sub === 'bomba' ? {} : { dn: /^DN/.test(dn) ? dn : undefined }); colocar(el, prev); anadir(el, id); prev = el; tubo(k + 1);
                });
                if (hasta && equipos[hasta]) {
                    if (!equipos[hasta].el) { const pb = puertoLibreSalida(prev), el = crearEquipo(hasta, 0, 0, id); const pe = entradaEquipo(el); el.x += pb.x - pe.x; el.y -= (pb.y - pe.y); }
                    else avisos.push(`${id}: el final llega a ${hasta}, ya dibujado en otra línea: conéctalo a mano.`);
                } else if (hasta) avisos.push(`${id}: el equipo de destino «${hasta}» no está en la hoja Equipos.`);
                nL++; y -= 110;
            });
            // equipos que no aparecen en ninguna línea
            Object.entries(equipos).forEach(([tag, q]) => { if (!q.el) { crearEquipo(tag, MM(30), y, (lineas.find(l => l.tipo === 'principal') || {}).id); y -= 90; } });
            renderizarVectorial(); renderArbol(); try { ajustarVistaVentana(); } catch (e) { }
            seleccion.clear(); nuevos.forEach(n => seleccion.add(n.id)); actualizarSeleccion();
            alert(`Esquema base generado: ${nL} línea(s), ${nT} tuberías, ${Object.keys(equipos).length} equipo(s), ${nuevos.length} elementos.${avisos.length ? '\n\n' + avisos.slice(0, 20).join('\n') : ''}\n\nRevisa la disposición, une los extremos que hayan quedado libres y completa los datos de cálculo.`);
        }
function elementoDeTipoTubo(mat, ser, dn, L, za, zb) {
            const m = CAT.materiales[mat] ? mat : MATERIAL_DEF;
            const el = { id: 'sym_' + Date.now() + '_' + Math.floor(Math.random() * 1e6), type: 'tuberia', material: m, serie: ser || (CAT.materiales[m] || {}).serieDef, dn, longitud: L, cotaA: za, cotaB: zb, x: 0, y: 0, scale: 1, rotation: 0, name: '' };
            normalizarElemento(el); return el;
        }
function puertoLibreSalida(el) {
            const libres = puertosLibres().filter(p => p.el.id === el.id);
            const ps = libres.length ? libres : obtenerPuertosConexion(el);
            return ps.slice().sort((a, b) => b.x - a.x)[0];
        }
function entradaEquipo(el) { const ps = obtenerPuertosConexion(el); return ps.slice().sort((a, b) => a.x - b.x)[0]; }
function winAnsi(s) {
            let o = '';
            for (const ch of String(s)) { const c = ch.codePointAt(0); if ((c >= 32 && c < 127) || (c >= 160 && c <= 255)) o += ch; else if (WINANSI_EXTRA[ch]) o += String.fromCharCode(WINANSI_EXTRA[ch]); else if (SUSTITUTOS_PDF[ch] != null) o += winAnsi(SUSTITUTOS_PDF[ch]); else if (c === 9) o += ' '; else o += '?'; }
            return o;
        }
function colorPDF(c) { if (!c || c === 'none' || c === 'transparent') return null; const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); if (v.length > 3 && v[3] === 0) return null; return { rgb: v.slice(0, 3).map(x => nPDF(x / 255)).join(' '), a: v.length > 3 ? v[3] : 1 }; }
function trayectoPDF(d, T) {
            const tk = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, qx = 0, qy = 0, o = '';
            const num = () => +tk[i++], P = (a, b) => { const p = T(a, b); return nPDF(p[0]) + ' ' + nPDF(p[1]); };
            const cub = (x1, y1, x2, y2, x3, y3) => { o += `${P(x1, y1)} ${P(x2, y2)} ${P(x3, y3)} c\n`; };
            const arco = (rx, ry, rot, fa, fs, x2, y2) => {
                if (!rx || !ry) { o += P(x2, y2) + ' l\n'; return; }
                const ph = rot * Math.PI / 180, cs = Math.cos(ph), sn = Math.sin(ph), dx = (x - x2) / 2, dy = (y - y2) / 2, x1p = cs * dx + sn * dy, y1p = -sn * dx + cs * dy;
                rx = Math.abs(rx); ry = Math.abs(ry); const L = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry); if (L > 1) { rx *= Math.sqrt(L); ry *= Math.sqrt(L); }
                const sg = fa === fs ? -1 : 1, num_ = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, co = sg * Math.sqrt(Math.max(0, num_ / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
                const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx, ccx = cs * cxp - sn * cyp + (x + x2) / 2, ccy = sn * cxp + cs * cyp + (y + y2) / 2;
                const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
                let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry), dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
                if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
                const n = Math.ceil(Math.abs(dt) / (Math.PI / 2)), h = dt / n, kk = 4 / 3 * Math.tan(h / 4);
                const pt = t => [ccx + rx * Math.cos(t) * cs - ry * Math.sin(t) * sn, ccy + rx * Math.cos(t) * sn + ry * Math.sin(t) * cs];
                const dv = t => [-rx * Math.sin(t) * cs - ry * Math.cos(t) * sn, -rx * Math.sin(t) * sn + ry * Math.cos(t) * cs];
                for (let k = 0; k < n; k++) { const a = t1 + k * h, b = a + h, p0 = pt(a), p3 = pt(b), d0 = dv(a), d3 = dv(b); cub(p0[0] + kk * d0[0], p0[1] + kk * d0[1], p3[0] - kk * d3[0], p3[1] - kk * d3[1], p3[0], p3[1]); }
            };
            while (i < tk.length) {
                if (/[a-zA-Z]/.test(tk[i])) cmd = tk[i++]; else if (!cmd) { i++; continue; }
                const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), bx = rel ? x : 0, by = rel ? y : 0;
                if (C === 'M') { x = bx + num(); y = by + num(); sx = x; sy = y; o += P(x, y) + ' m\n'; cmd = rel ? 'l' : 'L'; cx = x; cy = y; continue; }
                if (C === 'Z') { o += 'h\n'; x = sx; y = sy; cx = x; cy = y; cmd = ''; continue; }
                if (C === 'L') { x = bx + num(); y = by + num(); o += P(x, y) + ' l\n'; cx = x; cy = y; }
                else if (C === 'H') { x = bx + num(); o += P(x, y) + ' l\n'; cx = x; cy = y; }
                else if (C === 'V') { y = (rel ? y : 0) + num(); o += P(x, y) + ' l\n'; cx = x; cy = y; }
                else if (C === 'C') { const x1 = bx + num(), y1 = by + num(), x2 = bx + num(), y2 = by + num(); x = bx + num(); y = by + num(); cub(x1, y1, x2, y2, x, y); cx = x2; cy = y2; }
                else if (C === 'S') { const x1 = 2 * x - cx, y1 = 2 * y - cy, x2 = bx + num(), y2 = by + num(); x = bx + num(); y = by + num(); cub(x1, y1, x2, y2, x, y); cx = x2; cy = y2; }
                else if (C === 'Q') { qx = bx + num(); qy = by + num(); const x3 = bx + num(), y3 = by + num(); cub(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x3 + 2 / 3 * (qx - x3), y3 + 2 / 3 * (qy - y3), x3, y3); x = x3; y = y3; cx = x; cy = y; }
                else if (C === 'T') { qx = 2 * x - qx; qy = 2 * y - qy; const x3 = bx + num(), y3 = by + num(); cub(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x3 + 2 / 3 * (qx - x3), y3 + 2 / 3 * (qy - y3), x3, y3); x = x3; y = y3; cx = x; cy = y; }
                else if (C === 'A') { const rx = num(), ry = num(), rot = num(), fa = num(), fs = num(), x2 = bx + num(), y2 = by + num(); arco(rx, ry, rot, fa, fs, x2, y2); x = x2; y = y2; cx = x; cy = y; }
                else i++;
            }
            return o;
        }
function elipsePDF(cx, cy, rx, ry, T) { const P = (a, b) => { const p = T(a, b); return nPDF(p[0]) + ' ' + nPDF(p[1]); }, k = KAPPA; return `${P(cx + rx, cy)} m\n${P(cx + rx, cy + k * ry)} ${P(cx + k * rx, cy + ry)} ${P(cx, cy + ry)} c\n${P(cx - k * rx, cy + ry)} ${P(cx - rx, cy + k * ry)} ${P(cx - rx, cy)} c\n${P(cx - rx, cy - k * ry)} ${P(cx - k * rx, cy - ry)} ${P(cx, cy - ry)} c\n${P(cx + k * rx, cy - ry)} ${P(cx + rx, cy - k * ry)} ${P(cx + rx, cy)} c\nh\n`; }
function rectPDF(x, y, w, h, r, T) {
            const P = (a, b) => { const p = T(a, b); return nPDF(p[0]) + ' ' + nPDF(p[1]); };
            if (!(r > 0)) return `${P(x, y)} m\n${P(x + w, y)} l\n${P(x + w, y + h)} l\n${P(x, y + h)} l\nh\n`;
            r = Math.min(r, w / 2, h / 2); const k = KAPPA * r;
            return `${P(x + r, y)} m\n${P(x + w - r, y)} l\n${P(x + w - r + k, y)} ${P(x + w, y + r - k)} ${P(x + w, y + r)} c\n${P(x + w, y + h - r)} l\n${P(x + w, y + h - r + k)} ${P(x + w - r + k, y + h)} ${P(x + w - r, y + h)} c\n${P(x + r, y + h)} l\n${P(x + r - k, y + h)} ${P(x, y + h - r + k)} ${P(x, y + h - r)} c\n${P(x, y + r)} l\n${P(x, y + r - k)} ${P(x + r - k, y)} ${P(x + r, y)} c\nh\n`;
        }
function paginaPDF() {
            const FMT = formatoActual(), S = FMT.w / ANCHO_A3, K = S * 72 / 25.4, Hpt = FMT.h * 72 / 25.4;
            const capas = new Map(), imgs = [], est = {};
            const capaConf = Object.fromEntries(capasActuales().map(c => [c.nombre, c]));
            const add = (capa, s) => { if (!capas.has(capa)) capas.set(capa, []); capas.get(capa).push(s); };
            const gs = (ca, CA) => { const k = `${nPDF(ca)}_${nPDF(CA)}`; est[k] = { ca, CA }; return '/G' + k.replace(/\./g, 'p') + ' gs\n'; };
            const recorrer = (n, capaForma, alfa, capaTexto = 'Text') => {
                if (n.nodeType !== 1) return;
                if (n.hasAttribute && n.hasAttribute('data-capa')) { capaForma = capaTexto = n.getAttribute('data-capa'); }
                const tag = n.tagName.toLowerCase();
                if (['defs', 'pattern', 'marker', 'clippath', 'mask', 'title', 'style', 'script', 'foreignobject'].includes(tag)) return;
                if (n.classList.contains('connection-port') || n.classList.contains('punto-enganche') || n.classList.contains('no-imprimir') || n.id === 'rejilla' || n.id === 'guias-arrastre' || n.id === 'capa-guias') return;
                const cs = getComputedStyle(n); if (cs.display === 'none') return;
                const a = alfa * (parseFloat(cs.opacity) || (cs.opacity === '0' ? 0 : 1)); if (a <= 0.001) return;
                if (tag === 'g' || tag === 'svg' || tag === 'a') { [...n.children].forEach(c => recorrer(c, capaForma, a, capaTexto)); return; }
                if (cs.visibility === 'hidden') return;
                if (tag === 'rect' && n.getAttribute('fill') === 'transparent') return;
                const m = n.getCTM(); if (!m) return;
                const T = (x, y) => [(m.a * x + m.c * y + m.e) * K, Hpt - (m.b * x + m.d * y + m.f) * K];
                const num = k => parseFloat(n.getAttribute(k)) || 0, esc_ = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
                if (tag === 'text') {
                    const t = winAnsi(n.textContent.replace(/\s+/g, ' ')); if (!t.trim()) return;
                    const f = colorPDF(cs.fill); if (!f) return;
                    const fs = parseFloat(cs.fontSize) || 7, neg = (parseInt(cs.fontWeight, 10) || 400) >= 600, ital = cs.fontStyle === 'italic';
                    const xs = (n.getAttribute('x') || '0').split(/[\s,]+/).map(Number), ys = (n.getAttribute('y') || '0').split(/[\s,]+/).map(Number);
                    const anc = cs.textAnchor === 'middle' ? 0.5 : cs.textAnchor === 'end' ? 1 : 0, x = (xs[0] || 0) - anc * anchoHelv(t, neg) * fs, y = ys[0] || 0, p = T(x, y);
                    add(capaTexto, `q\n${f.a * a < 0.999 ? gs(f.a * a, 1) : ''}${f.rgb} rg\nBT /${neg ? 'F2' : ital ? 'F3' : 'F1'} ${nPDF(fs)} Tf ${nPDF(K * m.a)} ${nPDF(-K * m.b)} ${nPDF(-K * m.c)} ${nPDF(K * m.d)} ${nPDF(p[0])} ${nPDF(p[1])} Tm (${escPDF(t)}) Tj ET\nQ\n`);
                    return;
                }
                if (tag === 'image') {
                    const href = n.getAttribute('href') || n.getAttributeNS('http://www.w3.org/1999/xlink', 'href'); if (!href) return;
                    imgs.push({ href, capa: capaForma, x: num('x'), y: num('y'), w: num('width'), h: num('height'), m: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }, K, Hpt, alfa: a }); add(capaForma, { img: imgs.length - 1 });
                    return;
                }
                let geo = '';
                if (tag === 'line') { const p = T(num('x1'), num('y1')), q = T(num('x2'), num('y2')); geo = `${nPDF(p[0])} ${nPDF(p[1])} m\n${nPDF(q[0])} ${nPDF(q[1])} l\n`; }
                else if (tag === 'polyline' || tag === 'polygon') { const v = (n.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); for (let k = 0; k + 1 < v.length; k += 2) { const p = T(v[k], v[k + 1]); geo += `${nPDF(p[0])} ${nPDF(p[1])} ${k ? 'l' : 'm'}\n`; } if (tag === 'polygon' && geo) geo += 'h\n'; }
                else if (tag === 'rect') geo = rectPDF(num('x'), num('y'), num('width'), num('height'), num('rx') || num('ry'), T);
                else if (tag === 'circle') geo = elipsePDF(num('cx'), num('cy'), num('r'), num('r'), T);
                else if (tag === 'ellipse') geo = elipsePDF(num('cx'), num('cy'), num('rx'), num('ry'), T);
                else if (tag === 'path') geo = trayectoPDF(n.getAttribute('d') || '', T);
                if (!geo) return;
                const fill = tag === 'line' ? null : colorPDF(cs.fill), st = colorPDF(cs.stroke), sw = (parseFloat(cs.strokeWidth) || 0) * esc_ * K;
                const fa = fill ? fill.a * (parseFloat(cs.fillOpacity) || (cs.fillOpacity === '0' ? 0 : 1)) * a : 0, sa = st ? st.a * (parseFloat(cs.strokeOpacity) || (cs.strokeOpacity === '0' ? 0 : 1)) * a : 0;
                const hayF = fill && fa > 0.001, hayS = st && sa > 0.001 && sw > 0; if (!hayF && !hayS) return;
                let o = 'q\n' + (fa < 0.999 && hayF || sa < 0.999 && hayS ? gs(hayF ? fa : 1, hayS ? sa : 1) : '');
                if (hayF) o += fill.rgb + ' rg\n';
                if (hayS) {
                    o += `${st.rgb} RG\n${nPDF(sw)} w\n${{ round: 1, square: 2 }[cs.strokeLinecap] || 0} J\n${{ round: 1, bevel: 2 }[cs.strokeLinejoin] || 0} j\n`;
                    const da = cs.strokeDasharray && cs.strokeDasharray !== 'none' ? cs.strokeDasharray.split(/[\s,]+/).map(parseFloat).filter(v => !isNaN(v)) : [];
                    if (da.length && da.some(v => v > 0)) o += `[${da.map(v => nPDF(v * esc_ * K)).join(' ')}] 0 d\n`;
                }
                const regla = cs.fillRule === 'evenodd' ? '*' : '';
                o += geo + (hayF && hayS ? 'B' + regla : hayF ? 'f' + regla : 'S') + '\nQ\n';
                add(capaForma, o);
            };
            const gF = svgCanvas.querySelector('#capa-formato'); if (gF) recorrer(gF, 'Bord', 1);
            ['#lideres-notas'].forEach(sel => { const g = svgCanvas.querySelector(sel); if (g) recorrer(g, 'Object', 1); });
            svgCanvas.querySelectorAll('g[data-id]').forEach(g => { const el = elementosRed.find(e => e.id === g.getAttribute('data-id')); if (el) recorrer(g, capaDe(el), 1); });
            const gE = svgCanvas.querySelector('#capa-etiquetas'); if (gE) recorrer(gE, 'Object', 1);
            return { w: FMT.w * 72 / 25.4, h: Hpt, capas, imgs, est, conf: capaConf, hoja: codigoHoja() };
        }
function conHoja(i, fn, marcaAgua) {
            const g = { e: elementosRed, l: lineas, cc: condicionesContorno, f: opciones.formato, h: hojaActual, c: planoCongelado, sel: idSeleccionado, s: new Set(seleccion), gu: guias };
            const h = hojas[i];
            try {
                hojaActual = i; elementosRed = h.e || []; lineas = h.l || []; condicionesContorno = h.cc || {}; opciones.formato = h.formato || g.f; idSeleccionado = null; seleccion.clear(); guias = [];
                aplicarFormato(); renderizarVectorial();
                document.querySelectorAll('.asa-tubo, #fantasma-mano, #pista-snap, #guias-arrastre').forEach(x => x.remove());
                if (marcaAgua) ponerMarcaAgua();
                return fn();
            } finally {
                quitarMarcaAgua();
                hojaActual = g.h; elementosRed = g.e; lineas = g.l; condicionesContorno = g.cc; opciones.formato = g.f; idSeleccionado = g.sel; g.s.forEach(x => seleccion.add(x)); guias = g.gu;
                aplicarFormato(); renderizarVectorial();
            }
        }
async function imagenJPEG(href) {
            return new Promise((ok, mal) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { try { const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0); const b = atob(cv.toDataURL('image/jpeg', 0.92).split(',')[1]); const u = new Uint8Array(b.length); for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); ok({ datos: u, w: cv.width, h: cv.height }); } catch (e) { mal(e); } }; im.onerror = () => mal(new Error('imagen')); im.src = href; });
        }
async function comprimirPDF(bytes) {
            if (typeof CompressionStream === 'undefined') return null;
            try { const cs = new CompressionStream('deflate'), w = cs.writable.getWriter(); w.write(bytes); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); } catch (e) { return null; }
        }
async function escribirPDF(paginas, titulo) {
            const objs = []; const nuevo = () => { objs.push(null); return objs.length; };
            const fijar = (n, v) => { objs[n - 1] = v; };
            const cat = nuevo(), arbol = nuevo(), fF1 = nuevo(), fF2 = nuevo(), fF3 = nuevo(), info = nuevo();
            [[fF1, 'Helvetica'], [fF2, 'Helvetica-Bold'], [fF3, 'Helvetica-Oblique']].forEach(([n, f]) => fijar(n, `<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
            // capas (OCG) en el orden de CAD > Capas
            const nombresCapa = []; const conf = paginas[0] ? paginas[0].conf : {};
            const orden = Object.keys(conf); paginas.forEach(p => p.capas.forEach((v, k) => { if (!nombresCapa.includes(k)) nombresCapa.push(k); }));
            nombresCapa.sort((a, b) => (orden.indexOf(a) + 1 || 999) - (orden.indexOf(b) + 1 || 999));
            const ocg = {}; nombresCapa.forEach(k => { ocg[k] = nuevo(); fijar(ocg[k], `<< /Type /OCG /Name (${escPDF(winAnsi(k))}) >>`); });
            const idsPag = [];
            for (const p of paginas) {
                const cont = nuevo(), pag = nuevo(); idsPag.push(pag);
                const xo = {}; let s = '';
                for (let ix = 0; ix < p.imgs.length; ix++) {
                    const im = p.imgs[ix]; try { const j = await imagenJPEG(im.href); const n = nuevo(); fijar(n, { dict: `<< /Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, datos: j.datos, sinComprimir: true }); xo['Im' + ix] = n; im.ok = j; } catch (e) { console.warn('PDF: logotipo no incluido', e); }
                }
                const props = []; let k = 0;
                for (const nom of nombresCapa) {
                    const c = p.conf[nom] || {}; if (c.imprimible === false || c.inutilizada) continue;
                    const ops = p.capas.get(nom); if (!ops || !ops.length) continue;
                    props.push(`/OC${k} ${ocg[nom]} 0 R`);
                    s += `/OC /OC${k} BDC\n`;
                    ops.forEach(o => {
                        if (typeof o === 'string') { s += o; return; }
                        const im = p.imgs[o.img]; if (!im.ok) return;
                        const m = im.m, sc = Math.min(im.w / im.ok.w, im.h / im.ok.h), w = im.ok.w * sc, h = im.ok.h * sc, x = im.x + (im.w - w) / 2, y = im.y + (im.h - h) / 2, K = im.K;
                        const X = (m.a * x + m.c * (y + h) + m.e) * K, Y = im.Hpt - (m.b * x + m.d * (y + h) + m.f) * K;
                        s += `q\n${nPDF(K * m.a * w)} ${nPDF(-K * m.b * w)} ${nPDF(-K * m.c * h)} ${nPDF(K * m.d * h)} ${nPDF(X)} ${nPDF(Y)} cm\n/Im${o.img} Do\nQ\n`;
                    });
                    s += 'EMC\n'; k++;
                }
                fijar(cont, { dict: '<<', datos: bytesLatin(s) });
                const gsDic = Object.entries(p.est).map(([key, v]) => `/G${key.replace(/\./g, 'p')} << /Type /ExtGState /ca ${nPDF(v.ca)} /CA ${nPDF(v.CA)} >>`).join(' ');
                fijar(pag, `<< /Type /Page /Parent ${arbol} 0 R /MediaBox [0 0 ${nPDF(p.w)} ${nPDF(p.h)}] /Contents ${cont} 0 R /Resources << /Font << /F1 ${fF1} 0 R /F2 ${fF2} 0 R /F3 ${fF3} 0 R >> /ExtGState << ${gsDic} >> /Properties << ${props.join(' ')} >> /XObject << ${Object.entries(xo).map(([a, b]) => `/${a} ${b} 0 R`).join(' ')} >> >> >>`);
            }
            fijar(arbol, `<< /Type /Pages /Kids [${idsPag.map(n => n + ' 0 R').join(' ')}] /Count ${idsPag.length} >>`);
            const off = nombresCapa.filter(k => conf[k] && conf[k].visible === false);
            fijar(cat, `<< /Type /Catalog /Pages ${arbol} 0 R /PageMode /UseOC /OCProperties << /OCGs [${nombresCapa.map(k => ocg[k] + ' 0 R').join(' ')}] /D << /Name (PIPING) /Order [${nombresCapa.map(k => ocg[k] + ' 0 R').join(' ')}] /ON [${nombresCapa.filter(k => !off.includes(k)).map(k => ocg[k] + ' 0 R').join(' ')}] /OFF [${off.map(k => ocg[k] + ' 0 R').join(' ')}] >> >> >>`);
            const d = new Date(), f2 = v => String(v).padStart(2, '0');
            fijar(info, `<< /Title (${escPDF(winAnsi(titulo || 'PIPING'))}) /Producer (PIPING) /Creator (PIPING) /CreationDate (D:${d.getFullYear()}${f2(d.getMonth() + 1)}${f2(d.getDate())}${f2(d.getHours())}${f2(d.getMinutes())}${f2(d.getSeconds())}) >>`);
            // serialización
            const partes = [bytesLatin('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n')], offs = []; let pos = partes[0].length;
            const meter = u => { partes.push(u); pos += u.length; };
            for (let n = 1; n <= objs.length; n++) {
                offs.push(pos); const o = objs[n - 1];
                if (typeof o === 'string') { meter(bytesLatin(`${n} 0 obj\n${o}\nendobj\n`)); continue; }
                let datos = o.datos, filtro = '';
                if (!o.sinComprimir) { const z = await comprimirPDF(datos); if (z) { datos = z; filtro = ' /Filter /FlateDecode'; } }
                const dict = o.dict === '<<' ? `<< /Length ${datos.length}${filtro} >>` : `${o.dict} /Length ${datos.length}${filtro} >>`;
                meter(bytesLatin(`${n} 0 obj\n${dict}\nstream\n`)); meter(datos); meter(bytesLatin('\nendstream\nendobj\n'));
            }
            const xref = pos; let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`; offs.forEach(v => { x += String(v).padStart(10, '0') + ' 00000 n \n'; });
            x += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`; meter(bytesLatin(x));
            return new Blob(partes, { type: 'application/pdf' });
        }
async function exportarPDFCapas__p(indices, opc = {}) {
            cerrarMenus(); sincronizarHoja();
            indices = indices && indices.length ? indices : hojas.map((h, i) => i);
            indices = indices.slice().sort((a, b) => (parseInt(hojas[a].id, 10) || 0) - (parseInt(hojas[b].id, 10) || 0));   // de la 00 a la última
            try {
                aviso('Generando el PDF vectorial…');
                const paginas = indices.map(i => conHoja(i, paginaPDF, !!opc.marcaAgua));
                const blob = await escribirPDF(paginas, [proyecto.numero, proyecto.nombrePlano].filter(Boolean).join(' - '));
                const nombre = (indices && indices.length > 1 ? nombreArchivoPlano().replace(/-H[^_]*_/, '-H' + hojas[indices[0]].id + 'a' + hojas[indices[indices.length - 1]].id + '_') : nombreArchivoPlano(indices && indices.length ? indices[0] : null)) + '.pdf';
                const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
                window.__ultimoPDF = blob;
                const coreano = paginas.some(p => [...p.capas.values()].some(ops => ops.some(o => typeof o === 'string' && /\(\?+/.test(o))));
                aviso(`PDF con ${paginas.length} página(s) y capas CAD generado: ${nombre}.${coreano ? ' Algunos caracteres no WinAnsi (p. ej. coreano) se han sustituido por «?»: usa Imprimir > Guardar como PDF para esos textos.' : ''}`, 'ok');
            } catch (e) { console.error(e); aviso('No se ha podido generar el PDF: ' + e.message, 'error'); }
        }
function importarExcel__p() {
            const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls,.csv';
            input.onchange = async ev => {
                const f = ev.target.files[0]; if (!f) return;
                try {
                    const X = await cargarXLSX(), wb = X.read(await f.arrayBuffer(), { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]];
                    const filas = X.utils.sheet_to_json(ws, { defval: '' });
                    const col = (r, ...ns) => { const k = Object.keys(r).find(k => ns.some(n => k.toLowerCase().startsWith(n))); return k != null ? r[k] : ''; };
                    const porLinea = new Map();
                    filas.forEach(r => { const l = String(col(r, 'línea', 'linea')).trim(); if (l) (porLinea.get(l) || porLinea.set(l, []).get(l)).push(r); });
                    if (!porLinea.size) throw new Error('No se han encontrado filas con la columna "Línea".');
                    guardarEstado(); invalidarResultados(); document.getElementById('empty-state')?.remove();
                    const avisos = [];
                    let yBase = elementosRed.length ? Math.min(...elementosRed.map(e => e.y)) - 120 : 900, n = 0;
                    porLinea.forEach((rows, id) => {
                        if (!lineaPorId(id)) lineas.push({ id, tipo: /^P/i.test(id) ? 'principal' : 'ramal', nombre: String(col(rows[0], 'nombre')).trim(), padre: /^P/i.test(id) ? undefined : (lineas.find(l => l.tipo === 'principal') || {}).id, desde: null });
                        let prev = null;
                        rows.forEach((r, i) => {
                            const mat = String(col(r, 'material')).trim() || MATERIAL_DEF, ser = String(col(r, 'serie')).trim(), dn = String(col(r, 'dn')).trim();
                            if (!CAT.materiales[mat]) avisos.push(`${id} fila ${i + 1}: material "${mat}" desconocido; se usa ${MATERIAL_DEF}.`);
                            const el = { id: `sym_${Date.now()}_${n++}`, type: 'tuberia', material: CAT.materiales[mat] ? mat : MATERIAL_DEF, serie: ser || (CAT.materiales[mat] || CAT.materiales[MATERIAL_DEF]).serieDef, dn: dn || 'DN 50',
                                longitud: +col(r, 'longitud') || 3000, cotaA: +col(r, 'cota a') || 0, cotaB: +col(r, 'cota b') || 0, x: 80, y: yBase, scale: 1, rotation: 0, name: '', linea: id };
                            const serieAntes = el.serie, dnAntes = el.dn;
                            normalizarElemento(el);
                            if (el.serie !== serieAntes || el.dn !== dnAntes) avisos.push(`${id} fila ${i + 1}: ${dnAntes} ${serieAntes} no existe; se usa ${el.dn} ${el.serie}.`);
                            if (Math.abs(el.cotaB - el.cotaA) > el.longitud / 1000) { el.cotaB = el.cotaA; avisos.push(`${id} fila ${i + 1}: desnivel mayor que la longitud; se iguala la cota b.`); }
                            if (prev) { const pb = obtenerPuertosConexion(prev).find(p => p.id === 'b'), pa = obtenerPuertosConexion(el).find(p => p.id === 'a'); el.x += pb.x - pa.x; el.y -= (pb.y - pa.y); }
                            else el.inicioLinea = true;
                            elementosRed.push(el); asignarNumero(el); prev = el;
                        });
                        yBase -= 90;
                    });
                    renderizarVectorial(); ajustarVistaVentana();
                    alert(`Importadas ${n} tuberías en ${porLinea.size} línea(s).${avisos.length ? '\n\n' + avisos.slice(0, 15).join('\n') : ''}\n\nInserta después válvulas, accesorios y conexiones entre líneas.`);
                } catch (e) { console.error(e); alert('No se ha podido importar: ' + e.message); }
            };
            input.click();
        }
PARTES_OK.cad = true;
