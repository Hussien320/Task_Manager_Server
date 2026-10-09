import { authGuard } from "@/lib/auth/guard";
import { productservice } from "@/services/ProductService";
import { PERMISSION } from "@/types/Roles";
import { BadRequestException } from "@/utils/exceptions/http/BadRequestException";
import handleRouteError from "@/utils/handleRouteError";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authError = authGuard(request, { requirePermission: PERMISSION.READ_PRODUCT });
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const productName = searchParams.get("nme") ?? searchParams.get("name");

    if (!productName || !productName.trim()) {
      throw new BadRequestException("Product name query parameter is required");
    }

    const product = await productservice.getProductByName(productName.trim());

    return NextResponse.json(
      {
        success: true,
        data: product,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, {
      operation: "GET /api/products/by-name",
      permissionMessage: "You do not have permission to view product details",
      itemNotFoundMessage: "product not found",
    });
  }
}
