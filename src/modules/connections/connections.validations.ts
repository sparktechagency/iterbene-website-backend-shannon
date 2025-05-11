import { z } from "zod";

const addConnectionValidationSchema = z.object({
    body: z.object({
        receivedBy: z.string({
            required_error: 'Received By is required',
            invalid_type_error: 'Received By must be a string',
        })

    })
})


export const ConnectionValidation = {
    addConnectionValidationSchema
}