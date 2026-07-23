# Plan de retención y crecimiento de datos · FactoFarm

Documento operativo para evitar que el volumen multi-tenant (ventas, kardex, auditoría, SUNAT) degrade la plataforma a medida que crecen los clientes.

**Fuente canónica:** `api-factofarm/docs/DATA-RETENTION-PLAN.md`  
**Contexto:** una sola PostgreSQL compartida; aislamiento lógico por `tenantId` / `establishmentId`.  
**Principio:** primero **observabilidad + índices**; luego **purga solo de lo seguro**; **nunca borrar** ventas/comprobantes/kardex sin archivado y marco legal.

---

## Estado de implementación

| Fase | Estado |
|------|--------|
| 1 · Fundación | **Hecha** |
| 2 · Purga AuditLog | **Hecha** |
| 3 · Cold storage ventas/kardex | **Hecha** (API + UI consulta en Notas de venta / Reporte Kardex) |
| 4 · Particionado | **Script preparado** (`api-factofarm/prisma/scripts/phase4-partitioning-prep.sql`) |
| 5 · Multi-DB | **Documentado** (sin router aún) |

Ver el documento completo en el repo API para APIs, env y operación.
