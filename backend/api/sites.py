import json
from flask_restx import Namespace, Resource
from flask import request
from db import get_db

ns = Namespace("sites", description="基地接口", path="/sites")


@ns.route("/<string:site_id>")
class SiteDetail(Resource):
    def get(self, site_id):
        """获取单个基地完整信息（含评分数据）"""
        db = get_db()
        row = db.execute(
            """SELECT id, numeric_id, name, lat, lng, country, type, status,
                      strategic_value, score_json
               FROM geo_pos WHERE id = ?""",
            (site_id,),
        ).fetchone()
        db.close()

        if row is None:
            ns.abort(404, f"基地 {site_id} 不存在")

        score = json.loads(row["score_json"])
        return {
            "id": row["id"],
            "numeric_id": row["numeric_id"],
            "name": row["name"],
            "lat": row["lat"],
            "lng": row["lng"],
            "country": row["country"],
            "type": row["type"],
            "status": row["status"],
            "strategic_value": row["strategic_value"],
            **score,
        }


@ns.route("/<string:site_id>/timeline")
class SiteTimeline(Resource):
    def get(self, site_id):
        """获取基地影像时间轴（按 create_time 倒序）"""
        limit = request.args.get("limit", 100, type=int)
        available = request.args.get("available", type=int)

        db = get_db()
        # 先查 numeric_id
        row = db.execute(
            "SELECT numeric_id FROM geo_pos WHERE id = ?", (site_id,)
        ).fetchone()

        if row is None:
            db.close()
            ns.abort(404, f"基地 {site_id} 不存在")

        numeric_id = row["numeric_id"]

        query = "SELECT id, geo_pos_id, image_id, create_time, available FROM geo_pos_image WHERE geo_pos_id = ?"
        params = [numeric_id]

        if available is not None:
            query += " AND available = ?"
            params.append(available)

        query += " ORDER BY create_time DESC LIMIT ?"
        params.append(limit)

        rows = db.execute(query, params).fetchall()
        db.close()

        return [
            {
                "id": r["id"],
                "geo_pos_id": r["geo_pos_id"],
                "image_id": r["image_id"],
                "create_time": r["create_time"],
                "available": bool(r["available"]),
            }
            for r in rows
        ]
