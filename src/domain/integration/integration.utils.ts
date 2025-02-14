import { editLeadsByIdCustomFieldsValueRequest, editLeadsByIdVarsValueRequest } from 'src/external/amo-crm/amo-crm.dto';

export class IntegrationUtils {
  // TODO: docstring, assigner: maxi-q
  public replaceVariables(str: string, vars: { [x: string]: any; }) {
    return str.replace(/(\w+)/g, (match, p1) => {
      return vars[p1] !== undefined ? vars[p1] : match;
    });
  }

  public convertSenlerVarsToAmoFields(syncableVariables, senlerLeadVars) {
    const customFieldsValues: editLeadsByIdCustomFieldsValueRequest[] = [];

    for (const key in syncableVariables) {
      const fromValue = syncableVariables[key].from;
      const toValue = syncableVariables[key].to;

      const field_id = this.replaceVariables(toValue, senlerLeadVars);
      const value = this.replaceVariables(fromValue, senlerLeadVars);

      customFieldsValues.push({
        field_id: +field_id,
        values: [{ value: value.toString() }],
      });
    }

    return customFieldsValues;
  }

  public convertAmoFieldsToSenlerVars(syncableVariables, _amoLeadCustomFieldValues) {
    const customFieldsValues: editLeadsByIdVarsValueRequest = { vars: [], glob_vars: [] };

    for (const key in syncableVariables) {
      const fromValue = syncableVariables[key].from;
      const toValue = syncableVariables[key].to;

      const field_name = toValue;
      const value = fromValue; // по id из amoLeadCustomFieldValues подставить значение

      customFieldsValues.vars.push({
        n: field_name,
        v: value,
      });
    }

    return customFieldsValues;
  }
}
