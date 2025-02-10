import { editLeadsByIdRequestCustomFieldsValue } from 'src/external/amo-crm/amo-crm.dto';

export class IntegrationUtils {
  // TODO: docstring, assigner: maxi-q
  public replaceVariables(str, vars) {
    return str.replace(/{%(\w+)%}/g, (match, p1) => {
      return vars[p1] !== undefined ? vars[p1] : match;
    });
  }

  public senlerVarsToAmoFields(syncableVariables, senlerLeadVars) {
    const customFieldsValues: editLeadsByIdRequestCustomFieldsValue[] = [];

    for (const key in syncableVariables) {
      const fromValue = syncableVariables[key].from;
      const toValue = syncableVariables[key].to;

      const field_id = this.replaceVariables(fromValue, senlerLeadVars);
      const value = this.replaceVariables(toValue, senlerLeadVars);

      customFieldsValues.push({
        field_id: field_id,
        values: [{ value: value.toString() }],
      });
    }

    return customFieldsValues;
  }
}
